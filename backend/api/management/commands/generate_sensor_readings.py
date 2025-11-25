from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import Sensor, SensorReading
import random
from datetime import datetime
import pytz
import os
import ssl
import json
try:
    import paho.mqtt.client as mqtt
except Exception:
    mqtt = None


class Command(BaseCommand):
    help = 'Generate sample sensor readings for testing'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=100)
        parser.add_argument('--mqtt', action='store_true')
        parser.add_argument('--deveui', type=str, default=None)
        parser.add_argument('--port', type=int, default=85)

    def handle(self, *args, **options):
        count = options['count']
        if options.get('mqtt'):
            if mqtt is None:
                self.stderr.write('paho-mqtt not installed')
                return
            host = getattr(settings, 'MQTT_BROKER_HOST', None) or os.getenv('MQTT_BROKER_HOST') or '6e7e685648f54bfbab514e20990a8c06.s1.eu.hivemq.cloud'
            port = int(getattr(settings, 'MQTT_BROKER_PORT', None) or os.getenv('MQTT_BROKER_PORT') or '8883')
            user = getattr(settings, 'MQTT_USERNAME', None) or os.getenv('MQTT_USERNAME') or 'powertel'
            password = getattr(settings, 'MQTT_PASSWORD', None) or os.getenv('MQTT_PASSWORD') or '42;FckMxc'
            deveui = options.get('deveui') or f"TEST{random.randint(10000000,99999999)}"
            fport = int(options.get('port') or 85)
            client = mqtt.Client(client_id=f"tais-simulator-{os.getpid()}")
            client.username_pw_set(user, password)
            if port == 8883:
                try:
                    client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLS)
                except Exception:
                    client.tls_set()
            client.connect(host, port, keepalive=60)
            sent = 0
            for _ in range(count):
                value = round(random.uniform(10, 100), 2)
                payload = {
                    'value': value,
                    'timestamp': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
                    'deveui': deveui,
                    'port': fport,
                }
                topic = f"powerteltais/{deveui}/{fport}"
                client.publish(topic, json.dumps(payload), qos=int(getattr(settings, 'MQTT_QOS', 0)), retain=False)
                sent += 1
            client.disconnect()
            self.stdout.write(self.style.SUCCESS(f"Published {sent} messages to MQTT"))
            return

        sensors = Sensor.objects.all()
        if not sensors.exists():
            self.stdout.write(self.style.ERROR('No sensors found.'))
            return
        created_count = 0
        for _ in range(count):
            sensor = sensors.order_by('?').first()
            if sensor.sensor_type == 'temperature':
                value = round(random.uniform(20, 100), 2)
                is_alert = value > 80
            elif sensor.sensor_type == 'oil_level':
                value = round(random.uniform(0, 100), 2)
                is_alert = value < 20
            elif sensor.sensor_type == 'pressure':
                value = round(random.uniform(1, 10), 2)
                is_alert = value > 8
            elif sensor.sensor_type == 'current':
                value = round(random.uniform(0, 500), 2)
                is_alert = value > 450
            elif sensor.sensor_type == 'voltage':
                value = round(random.uniform(200, 250), 2)
                is_alert = value < 210 or value > 240
            else:
                value = round(random.uniform(0, 100), 2)
                is_alert = False
            SensorReading.objects.create(sensor=sensor, value=value, is_alert=is_alert)
            created_count += 1
        self.stdout.write(self.style.SUCCESS(f'Successfully created {created_count} sensor readings'))