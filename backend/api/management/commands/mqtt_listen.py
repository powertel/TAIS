from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import Transformer, Sensor, SensorReading, Device, DeviceSensorMap, Region, Depot, DeviceUplink
from django.utils import timezone
from api.realtime_views import push_sensor_update, push_device_update
import json
import time
import logging
import os
import ssl
import re
import base64

try:
    import paho.mqtt.client as mqtt
except ImportError:  # pragma: no cover
    mqtt = None

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Start MQTT listener to ingest sensor readings from HiveMQ"

    def add_arguments(self, parser):
        parser.add_argument('--host', type=str, default=getattr(settings, 'MQTT_BROKER_HOST', '6e7e685648f54bfbab514e20990a8c06.s1.eu.hivemq.cloud'))
        parser.add_argument('--port', type=int, default=getattr(settings, 'MQTT_BROKER_PORT', 8883))
        parser.add_argument('--username', type=str, default=getattr(settings, 'MQTT_USERNAME', 'powertel'))
        parser.add_argument('--password', type=str, default=getattr(settings, 'MQTT_PASSWORD', '42;FckMxc'))
        parser.add_argument('--topic', action='append', dest='topics')
        parser.add_argument('--run-seconds', type=int, default=0)
        parser.add_argument('--debug', action='store_true')

    def handle(self, *args, **options):
        if mqtt is None:
            self.stderr.write(self.style.ERROR('paho-mqtt is not installed. Install with `pip install paho-mqtt`'))
            return

        host = options['host']
        port = options['port']
        username = options['username']
        password = options['password']
        topics = options.get('topics') or getattr(settings, 'MQTT_TOPICS', ['powerteltais/+/+'])

        client_id = getattr(settings, 'MQTT_CLIENT_ID', '') or None
        if not client_id:
            client_id = f"tais-listener-{os.getpid()}"
        client = mqtt.Client(client_id=client_id)
        try:
            client.reconnect_delay_set(min_delay=1, max_delay=10)
        except Exception:
            pass

        if username:
            client.username_pw_set(username, password)

        # Enable TLS automatically for 8883
        if port == 8883:
            try:
                client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLS)
            except Exception:
                client.tls_set()

        def on_connect(c, userdata, flags, rc):
            if rc == 0:
                if not getattr(c, '_connected_logged', False):
                    self.stdout.write(self.style.SUCCESS(f'Connected to MQTT broker {host}:{port}'))
                    setattr(c, '_connected_logged', True)
                if not getattr(c, '_subs_done', False):
                    for t in topics:
                        qos = int(getattr(settings, 'MQTT_QOS', 0))
                        c.subscribe(t, qos=qos)
                        self.stdout.write(self.style.SUCCESS(f'Subscribed to topic: {t}'))
                    setattr(c, '_subs_done', True)
            else:
                self.stderr.write(self.style.ERROR(f'Failed to connect: rc={rc}'))

        def on_disconnect(c, userdata, rc):
            try:
                self.stderr.write(f'Disconnected from MQTT broker: rc={rc}')
            except Exception:
                pass
            try:
                setattr(c, '_connected_logged', False)
            except Exception:
                pass

        def parse_transformer_topic(topic: str):
            """
            Parse topic to extract transformer and sensor info.
            Expected formats:
            - powerteltais/region/{region_name}/depot/{depot_name}/transformer/{transformer_id}/sensor/{sensor_id}
            - powerteltais/{transformer_id}/{sensor_id} (legacy format)
            - powerteltais/{DEVEUI}/{PORT} (LORIOT output recommendation)
            """
            parts = topic.split('/')

            # Try to find transformer and sensor in the topic structure
            for i, part in enumerate(parts):
                if part == 'transformer' and i + 1 < len(parts):
                    transformer_id = parts[i + 1]
                    # Look for sensor after transformer
                    for j in range(i + 2, len(parts)):
                        if parts[j] == 'sensor' and j + 1 < len(parts):
                            sensor_id = parts[j + 1]
                            region_name = None
                            depot_name = None
                            # Look for region and depot in the topic
                            for k, p in enumerate(parts):
                                if p == 'region' and k + 1 < len(parts):
                                    region_name = parts[k + 1]
                                elif p == 'depot' and k + 1 < len(parts):
                                    depot_name = parts[k + 1]
                            return transformer_id, sensor_id, region_name, depot_name
                elif part == 'sensor' and i + 1 < len(parts):
                    # Handle legacy format: powerteltais/{transformer_id}/{sensor_id}
                    if i >= 1:  # Check if there's a transformer_id before sensor
                        transformer_id = parts[i - 1]
                        sensor_id = parts[i + 1]
                        return transformer_id, sensor_id, None, None

            # If not found in structured format, try simple format
            if len(parts) >= 3 and parts[0] in ['powerteltais', 'tais']:
                # Handle LORIOT style powerteltais/{DEVEUI}/{PORT}
                if len(parts) == 3:
                    deveui = parts[1]
                    port = parts[2]
                    try:
                        device = Device.objects.get(deveui=deveui)
                        mapping = DeviceSensorMap.objects.get(device=device, port=int(port))
                        transformer_id = mapping.sensor.transformer.transformer_id
                        sensor_id = mapping.sensor.sensor_id
                        return transformer_id, sensor_id, None, None
                    except (Device.DoesNotExist, DeviceSensorMap.DoesNotExist, ValueError):
                        return None, None, None, None
                transformer_id = parts[-2]  # Second to last
                sensor_id = parts[-1]      # Last
                return transformer_id, sensor_id, None, None

            return None, None, None, None

        def determine_alert_status(sensor_type, value):
            """Determine if a reading should be marked as an alert based on sensor type and value"""
            if value is None:
                return False

            # Convert value to float for comparison (except for specific types)
            try:
                # For contact, motion, video sensors, we might receive boolean-like values
                if sensor_type in ['contact', 'motion', 'video']:
                    # These sensors typically represent binary states
                    # An alert might be triggered when an unexpected state change occurs
                    # For now, we'll consider any active state as alert-worthy for these types
                    if isinstance(value, bool):
                        return value  # True means alert
                    elif isinstance(value, str):
                        # Consider "true", "1", "on", "active", "detected" as True
                        return value.lower() in ['true', '1', 'on', 'active', 'detected', 'yes', 'open']
                    else:
                        # Convert to boolean (non-zero values are True)
                        return bool(float(value))
                else:
                    # For numeric sensors, convert to float and compare against thresholds
                    float_value = float(value)

                    # Define alert thresholds for different sensor types
                    if sensor_type == 'temperature':
                        # Temperature alert if above 90°C or below -10°C
                        return float_value > 90.0 or float_value < -10.0
                    elif sensor_type == 'oil_level':
                        # Oil level alert if below 20% or above 95%
                        return float_value < 20.0 or float_value > 95.0
                    elif sensor_type == 'pressure':
                        # Pressure alert if outside normal operating range
                        return float_value < 10.0 or float_value > 100.0
                    elif sensor_type == 'current':
                        # Current alert - depends on transformer rating
                        return float_value > 1000.0  # Example threshold
                    elif sensor_type == 'voltage':
                        # Voltage alert - typically ±10% from nominal
                        return float_value < 10000.0 or float_value > 36000.0  # Example thresholds
                    elif sensor_type == 'humidity':
                        # Humidity alert if above 80% (could indicate moisture issues)
                        return float_value > 80.0
                    else:  # 'other' sensor type
                        return False
            except (ValueError, TypeError):
                # If conversion fails, return False as default
                return False

        def on_message(c, userdata, msg):
            payload_text = msg.payload.decode('utf-8', errors='ignore')
            try:
                self.stdout.write(f'RECV topic={msg.topic} payload={payload_text}')
            except Exception:
                pass
            try:
                with open('mqtt_debug.log', 'a', encoding='utf-8') as f:
                    f.write(f'{msg.topic} | {payload_text}\n')
            except Exception:
                pass
            transformer_id, sensor_id, region_name, depot_name = parse_transformer_topic(msg.topic)

            if (not transformer_id or not sensor_id) and msg.topic.startswith('powerteltais/'):
                parts = msg.topic.split('/')
                if len(parts) == 3:
                    deveui = parts[1]
                    try:
                        port = int(parts[2])
                    except ValueError:
                        port = None
                    if deveui and port is not None:
                        device, _ = Device.objects.get_or_create(deveui=deveui, defaults={'name': deveui})
                        device.last_seen = timezone.now()
                        device.save()

                        transformer = device.transformer
                        if transformer is None:
                            region, _ = Region.objects.get_or_create(name='Unassigned')
                            depot, _ = Depot.objects.get_or_create(name='Unassigned Depot', region=region)
                            transformer, _ = Transformer.objects.get_or_create(
                                transformer_id='UNASSIGNED',
                                defaults={'name': 'Unassigned Transformer', 'region': region, 'depot': depot, 'capacity': 0}
                            )
                            device.transformer = transformer
                            device.save()

                        sensor_key = f"{deveui}-{port}"
                        sensor, _ = Sensor.objects.get_or_create(
                            sensor_id=sensor_key,
                            transformer=transformer,
                            defaults={'name': f'{deveui} Port {port}', 'sensor_type': 'other'}
                        )
                        DeviceSensorMap.objects.get_or_create(device=device, port=port, sensor=sensor)
                        transformer_id = transformer.transformer_id
                        sensor_id = sensor.sensor_id

            if not transformer_id or not sensor_id:
                self.stderr.write(self.style.WARNING(f'Skipping message with missing transformer/sensor info: topic={msg.topic} payload={payload_text}'))
                return

            try:
                data = json.loads(payload_text)
            except json.JSONDecodeError:
                # If it's not JSON, treat the entire payload as a value
                data = {
                    'value': payload_text.strip(),
                    'timestamp': None,
                    'transformer_id': transformer_id,
                    'sensor_id': sensor_id,
                }

            port_from_payload = None
            try:
                pval = data.get('fPort', None)
                if pval is None:
                    pval = data.get('port', None)
                if pval is not None:
                    port_from_payload = int(pval)
            except Exception:
                port_from_payload = None

            if (not transformer_id or not sensor_id) and msg.topic.startswith('powerteltais/'):
                parts = msg.topic.split('/')
                if len(parts) == 2:
                    deveui = parts[1]
                    device, _ = Device.objects.get_or_create(deveui=deveui, defaults={'name': deveui})
                    device.last_seen = timezone.now()
                    device.save()
                    if port_from_payload is not None:
                        transformer = device.transformer
                        if transformer is None:
                            region, _ = Region.objects.get_or_create(name='Unassigned')
                            depot, _ = Depot.objects.get_or_create(name='Unassigned Depot', region=region)
                            transformer, _ = Transformer.objects.get_or_create(
                                transformer_id='UNASSIGNED',
                                defaults={'name': 'Unassigned Transformer', 'region': region, 'depot': depot, 'capacity': 0}
                            )
                            device.transformer = transformer
                            device.save()
                        sensor_key = f"{deveui}-{port_from_payload}"
                        sensor, _ = Sensor.objects.get_or_create(
                            sensor_id=sensor_key,
                            transformer=device.transformer,
                            defaults={'name': f'{deveui} Port {port_from_payload}', 'sensor_type': 'other'}
                        )
                        DeviceSensorMap.objects.get_or_create(device=device, port=port_from_payload, sensor=sensor)
                        transformer_id = device.transformer.transformer_id
                        sensor_id = sensor.sensor_id

            def to_bytes_from_data_field(s):
                if s is None:
                    return None
                if isinstance(s, (bytes, bytearray)):
                    return bytes(s)
                if not isinstance(s, str):
                    return None
                hs = s.strip()
                if re.fullmatch(r'[0-9A-Fa-f\s]+', hs):
                    hs = hs.replace(' ', '')
                    try:
                        return bytes.fromhex(hs)
                    except Exception:
                        return None
                try:
                    return base64.b64decode(hs, validate=False)
                except Exception:
                    return None

            def decode_lpp(buf):
                if not buf:
                    return {}
                i = 0
                out = []
                while i + 2 <= len(buf):
                    ch = buf[i]
                    t = buf[i + 1]
                    i += 2
                    if t in (0x02, 0x03, 0x67):
                        if i + 2 > len(buf):
                            break
                        b0, b1 = buf[i], buf[i + 1]
                        i += 2
                        be = ((b0 << 8) | b1)
                        if be >= 0x8000:
                            be = be - 0x10000
                        le = ((b1 << 8) | b0)
                        if le >= 0x8000:
                            le = le - 0x10000
                        v_be = be
                        v_le = le
                        if t == 0x02 or t == 0x03:
                            v_be = be / 100.0
                            v_le = le / 100.0
                            out.append({'channel': ch, 'type': t, 'value_be': v_be, 'value_le': v_le, 'name': 'analog'})
                        elif t == 0x67:
                            v_be = be / 10.0
                            v_le = le / 10.0
                            out.append({'channel': ch, 'type': t, 'value_be': v_be, 'value_le': v_le, 'name': 'temperature'})
                    elif t in (0x00, 0x01, 0x68):
                        if i + 1 > len(buf):
                            break
                        b = buf[i]
                        i += 1
                        if t == 0x68:
                            out.append({'channel': ch, 'type': t, 'value': (b / 2.0), 'name': 'humidity'})
                        elif t == 0x00:
                            out.append({'channel': ch, 'type': t, 'value': int(b), 'name': 'digital_in'})
                        elif t == 0x01:
                            out.append({'channel': ch, 'type': t, 'value': int(b), 'name': 'digital_out'})
                    else:
                        break
                best = None
                for rec in out:
                    if rec.get('name') == 'temperature':
                        v = rec.get('value_le')
                        if v is not None and -50.0 <= v <= 85.0:
                            best = v
                            break
                        v = rec.get('value_be')
                        if v is not None and -50.0 <= v <= 85.0:
                            best = v
                            break
                if best is None:
                    for rec in out:
                        if rec.get('name') == 'humidity':
                            best = rec.get('value')
                            break
                if best is None:
                    for rec in out:
                        if rec.get('name') in ['analog', 'digital_in', 'digital_out']:
                            v = rec.get('value') or rec.get('value_le') or rec.get('value_be')
                            if v is not None:
                                best = v
                                break
                return {'records': out, 'primary_value': best}

            def decode_elsys(buf):
                i = 0
                out = []
                primary = None
                while i < len(buf):
                    t = buf[i]
                    i += 1
                    if t == 0x01 and i + 1 < len(buf):
                        v = (buf[i] << 8) | buf[i + 1]
                        if v >= 0x8000:
                            v = v - 0x10000
                        temp = v / 10.0
                        out.append({'type': t, 'name': 'temperature', 'value': temp})
                        if primary is None:
                            primary = temp
                        i += 2
                    elif t == 0x02 and i < len(buf):
                        rh = buf[i]
                        out.append({'type': t, 'name': 'humidity', 'value': rh})
                        if primary is None:
                            primary = rh
                        i += 1
                    elif t == 0x0A and i < len(buf):
                        mv = buf[i]
                        out.append({'type': t, 'name': 'motion', 'value': mv})
                        if primary is None:
                            primary = mv
                        i += 1
                    else:
                        break
                return {'records': out, 'primary_value': primary}

            def decode_milesight(buf):
                return decode_lpp(buf)

            def decode_vendor(buf, hint=None):
                if not buf:
                    return {'codec': None, 'records': [], 'primary_value': None}
                if hint == 'cayenne' or hint == 'lpp':
                    d = decode_lpp(buf)
                    return {'codec': 'cayenne', 'records': d['records'], 'primary_value': d['primary_value']}
                if hint == 'elsys':
                    d = decode_elsys(buf)
                    return {'codec': 'elsys', 'records': d['records'], 'primary_value': d['primary_value']}
                if hint == 'milesight':
                    d = decode_milesight(buf)
                    return {'codec': 'milesight', 'records': d['records'], 'primary_value': d['primary_value']}
                d = decode_lpp(buf)
                if d.get('records'):
                    return {'codec': 'cayenne', 'records': d['records'], 'primary_value': d['primary_value']}
                d = decode_elsys(buf)
                if d.get('records'):
                    return {'codec': 'elsys', 'records': d['records'], 'primary_value': d['primary_value']}
                return {'codec': None, 'records': [], 'primary_value': None}

            value = data.get('value') or data.get('reading')
            raw_data_field = data.get('data') or data.get('Data')
            buf = to_bytes_from_data_field(raw_data_field)
            decoded = None
            device_codec_hint = None
            if msg.topic.startswith('powerteltais/'):
                parts = msg.topic.split('/')
                if len(parts) == 3:
                    deveui = parts[1]
                    dev = Device.objects.filter(deveui=deveui).first()
                    if dev and dev.codec:
                        device_codec_hint = dev.codec
            if value is None and buf:
                decoded = decode_vendor(buf, device_codec_hint)
                value = decoded.get('primary_value')
                if isinstance(data, dict):
                    data = {**data, 'decoded_vendor': decoded}
            if value is None and isinstance(data.get('payload'), dict):
                for k, v in data['payload'].items():
                    if isinstance(v, (int, float)):
                        value = v
                        break
            timestamp = data.get('timestamp')
            is_alert = bool(data.get('is_alert', False))

            if msg.topic.startswith('powerteltais/'):
                parts = msg.topic.split('/')
                if len(parts) == 3:
                    deveui = parts[1]
                    try:
                        port = int(parts[2])
                    except ValueError:
                        port = None
                    if deveui and port is not None:
                        device, _ = Device.objects.get_or_create(deveui=deveui, defaults={'name': deveui})
                        device.metadata = {
                            **(device.metadata or {}),
                            'last_payload': data,
                            'last_value': value,
                            'last_port': port,
                            'last_decoded': (decoded or None),
                            'codec': (decoded.get('codec') if decoded else None),
                        }
                        try:
                            if decoded and decoded.get('codec'):
                                if not device.codec or device.codec != decoded['codec']:
                                    device.codec = decoded['codec']
                        except Exception:
                            pass
                        device.last_seen = timezone.now()
                        device.save()
                        uplink = DeviceUplink.objects.create(
                            device=device,
                            port=port,
                            topic=msg.topic,
                            raw=data,
                            value=(None if value is None else value),
                        )
                        try:
                            push_device_update(device.id, port=port, value=value, codec=(decoded.get('codec') if decoded else None))
                        except Exception:
                            pass
                elif len(parts) == 2:
                    deveui = parts[1]
                    port = port_from_payload
                    device, _ = Device.objects.get_or_create(deveui=deveui, defaults={'name': deveui})
                    device.metadata = {
                        **(device.metadata or {}),
                        'last_payload': data,
                        'last_value': value,
                        'last_port': port,
                        'last_decoded': (decoded or None),
                        'codec': (decoded.get('codec') if decoded else None),
                    }
                    try:
                        if decoded and decoded.get('codec'):
                            if not device.codec or device.codec != decoded['codec']:
                                device.codec = decoded['codec']
                    except Exception:
                        pass
                    device.last_seen = timezone.now()
                    device.save()
                    if port is not None:
                        uplink = DeviceUplink.objects.create(
                            device=device,
                            port=port,
                            topic=msg.topic,
                            raw=data,
                            value=(None if value is None else value),
                        )
                    try:
                        push_device_update(device.id, port=port, value=value, codec=(decoded.get('codec') if decoded else None))
                    except Exception:
                        pass

            # Look for transformer by ID first
            try:
                transformer = Transformer.objects.get(transformer_id=transformer_id)
            except Transformer.DoesNotExist:
                self.stderr.write(self.style.WARNING(f'Transformer not found: {transformer_id}'))
                return

            # Look for the sensor by ID within the transformer
            try:
                sensor = Sensor.objects.get(sensor_id=sensor_id, transformer=transformer)
            except Sensor.DoesNotExist:
                # If sensor doesn't exist, try to find it by name
                try:
                    sensor = Sensor.objects.get(name=sensor_id, transformer=transformer)
                except Sensor.DoesNotExist:
                    self.stderr.write(self.style.WARNING(f'Sensor not found: {sensor_id} (transformer {transformer_id})'))
                    return

            # If alert status wasn't provided in the message, determine it based on thresholds
            if not is_alert:
                is_alert = determine_alert_status(sensor.sensor_type, value)

            # Always push updates to real-time stream, regardless of whether we save to DB
            # This ensures the dashboard always shows live data
            try:
                push_sensor_update(sensor.id, value, is_alert)
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Failed to push real-time update: {e}'))

            # Save policy: default to saving all readings, configurable via settings
            should_save_reading = getattr(settings, 'MQTT_SAVE_ALL_READINGS', True) or is_alert or sensor.sensor_type in ['video', 'motion', 'contact']

            if should_save_reading:
                try:
                    reading = SensorReading.objects.create(
                        sensor=sensor,
                        value=value,
                        is_alert=is_alert,
                        topic=msg.topic,
                        raw_payload=data,
                        decoded=(decoded or None),
                        # If timestamp is not provided, let auto_now_add handle
                        timestamp=data.get('timestamp') if data.get('timestamp') else None,
                        received_at=timezone.now()
                    )
                    alert_msg = "ALERT" if is_alert else ""
                    self.stdout.write(self.style.SUCCESS(
                        f'Saved reading - sensor={sensor_id} transformer={transformer_id} value={value} {alert_msg}'
                    ))
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f'Failed to save reading: {e}'))
            else:
                # Log that we received a normal value but didn't save it
                self.stdout.write(f'INFO: Received normal reading for sensor={sensor_id} value={value} (not saved)')

        client.on_connect = on_connect
        client.on_message = on_message
        try:
            client.on_disconnect = on_disconnect
        except Exception:
            pass

        if options.get('debug'):
            try:
                client.enable_logger(logger)
            except Exception:
                pass

        client.connect(host, port, keepalive=60)

        run_seconds = int(options.get('run-seconds') or 0)

        if run_seconds > 0:
            client.loop_start()
            try:
                time.sleep(run_seconds)
            finally:
                client.loop_stop()
                try:
                    client.disconnect()
                except Exception:
                    pass
        else:
            try:
                client.loop_forever()
            except KeyboardInterrupt:
                self.stdout.write('MQTT listener stopped.')
            finally:
                try:
                    client.disconnect()
                except Exception:
                    pass