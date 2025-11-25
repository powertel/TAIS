from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from .models import Sensor, SensorReading, Transformer, Device
from .serializers import SensorSerializer, SensorReadingSerializer
import json
import time
import threading
from queue import Queue
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

# Global queue to store real-time sensor updates
realtime_updates_queue = Queue()

from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponseBadRequest

@api_view(['GET'])
def sensor_realtime_stream(request):
    """
    Endpoint that serves real-time sensor updates using Server-Sent Events (SSE)
    """
    # Check authentication - we'll accept token via query parameter for SSE compatibility
    token = request.GET.get('token') or request.META.get('HTTP_AUTHORIZATION', '').split(' ')[-1]
    if not token or len(token) < 10:  # Basic check
        # Fallback to session authentication
        if not request.user.is_authenticated:
            return HttpResponseBadRequest("Authentication required")

    # If token is provided in query parameter, verify it
    if token and token.startswith('Bearer '):
        token = token[7:]  # Remove 'Bearer ' prefix
    elif token and len(token) > 10:  # Just a token without Bearer prefix
        pass  # Use as is
    else:
        token = None

    if token:
        from rest_framework_simplejwt.tokens import AccessToken
        try:
            AccessToken(token)
            # We could verify the token, but for SSE we'll just assume valid if it's a valid JWT format
        except Exception:
            # If token is invalid, check if user is authenticated via session
            if not request.user.is_authenticated:
                return HttpResponseBadRequest("Invalid token")

    def event_stream():
        yield f"data: {json.dumps({'type': 'connection', 'message': 'Connected to real-time sensor stream'})}\n\n"
        last_ts = timezone.now()
        while True:
            try:
                update = realtime_updates_queue.get(timeout=2)
                yield f"data: {json.dumps(update)}\n\n"
                continue
            except Exception:
                pass
            qs = list(SensorReading.objects.select_related('sensor__transformer__depot__region').filter(timestamp__gt=last_ts).order_by('timestamp')[:50])
            if qs:
                for r in qs:
                    update_data = {
                        'type': 'sensor_update',
                        'sensor_id': r.sensor.id if r.sensor_id else None,
                        'sensor_name': r.sensor.name if r.sensor_id else None,
                        'sensor_type': r.sensor.sensor_type if r.sensor_id else None,
                        'transformer_id': r.sensor.transformer.id if r.sensor_id else None,
                        'transformer_name': r.sensor.transformer.name if r.sensor_id else None,
                        'depot_name': r.sensor.transformer.depot.name if r.sensor_id else None,
                        'region_name': r.sensor.transformer.region.name if r.sensor_id else None,
                        'value': (float(r.value) if r.value is not None else None),
                        'is_alert': bool(r.is_alert),
                        'timestamp': int(time.time() * 1000),
                    }
                    yield f"data: {json.dumps(update_data)}\n\n"
                last_ts = qs[-1].timestamp
            else:
                yield ": heartbeat\n\n"

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['Connection'] = 'keep-alive'
    response['Access-Control-Allow-Origin'] = request.META.get('HTTP_ORIGIN', '*')
    response['Access-Control-Allow-Credentials'] = 'true'
    # Important SSE headers
    response['Content-Type'] = 'text/event-stream'
    response['Cache-Control'] = 'no-cache'
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def latest_sensor_readings(request):
    """
    Get the latest sensor readings for transformers the user has access to
    """
    user = request.user

    try:
        user_profile = user.profile
    except:
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get transformers based on access level
    if user_profile.is_national_level:
        transformers = Transformer.objects.all()
    elif user_profile.is_region_level and user_profile.region:
        transformers = Transformer.objects.filter(region=user_profile.region)
    elif user_profile.is_depot_level and user_profile.depot:
        transformers = Transformer.objects.filter(depot=user_profile.depot)
    else:
        transformers = Transformer.objects.none()

    # Get latest readings for all sensors of these transformers
    latest_readings = []
    for transformer in transformers:
        for sensor in transformer.sensors.filter(is_active=True):
            latest_reading = sensor.readings.order_by('-timestamp').first()
            if latest_reading:
                latest_readings.append({
                    'sensor_id': sensor.id,
                    'sensor_name': sensor.name,
                    'sensor_type': sensor.sensor_type,
                    'transformer_id': transformer.id,
                    'transformer_name': transformer.name,
                    'depot_name': transformer.depot.name,
                    'region_name': transformer.region.name,
                    'value': float(latest_reading.value),
                    'timestamp': latest_reading.timestamp,
                    'is_alert': latest_reading.is_alert
                })

    return Response({'readings': latest_readings})

# Function to push updates to the real-time stream
def push_sensor_update(sensor_id, value, is_alert=False):
    """Push a sensor update to all connected clients"""
    try:
        sensor = Sensor.objects.select_related('transformer__depot__region').get(id=sensor_id)
        update_data = {
            'type': 'sensor_update',
            'sensor_id': sensor.id,
            'sensor_name': sensor.name,
            'sensor_type': sensor.sensor_type,
            'transformer_id': sensor.transformer.id,
            'transformer_name': sensor.transformer.name,
            'depot_name': sensor.transformer.depot.name,
            'region_name': sensor.transformer.region.name,
            'value': value,
            'is_alert': is_alert,
            'timestamp': int(time.time() * 1000)  # Unix timestamp in milliseconds
        }

        # Add to the queue for broadcasting
        realtime_updates_queue.put(update_data)
        logger.info(f"Pushed sensor update: {update_data}")
    except Sensor.DoesNotExist:
        logger.error(f"Sensor with id {sensor_id} not found")
    except Exception as e:
        logger.error(f"Error pushing sensor update: {e}")

def push_device_update(device_id, port=None, value=None, codec=None):
    try:
        device = Device.objects.get(id=device_id)
        update_data = {
            'type': 'device_update',
            'device_id': device.id,
            'deveui': device.deveui,
            'port': port,
            'value': value,
            'codec': codec or device.codec or (device.metadata or {}).get('codec'),
            'timestamp': int(time.time() * 1000)
        }
        realtime_updates_queue.put(update_data)
    except Device.DoesNotExist:
        logger.error(f"Device with id {device_id} not found")
    except Exception as e:
        logger.error(f"Error pushing device update: {e}")

# Additional functions that might be referenced in urls.py
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_realtime_data(request, transformer_id):
    """Get real-time data for a specific transformer"""
    try:
        transformer = Transformer.objects.get(id=transformer_id)

        # Check if user has access to this transformer
        user_profile = request.user.profile
        has_access = False

        if user_profile.is_national_level:
            has_access = True
        elif user_profile.is_region_level and user_profile.region == transformer.region:
            has_access = True
        elif user_profile.is_depot_level and user_profile.depot == transformer.depot:
            has_access = True

        if not has_access:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # Get sensors and their latest readings for this transformer
        sensors_data = []
        for sensor in transformer.sensors.filter(is_active=True):
            latest_reading = sensor.readings.order_by('-timestamp').first()
            sensor_data = {
                'sensor_id': sensor.id,
                'sensor_name': sensor.name,
                'sensor_type': sensor.sensor_type,
                'description': sensor.description,
                'is_active': sensor.is_active,
                'latest_reading': None
            }

            if latest_reading:
                sensor_data['latest_reading'] = {
                    'value': float(latest_reading.value),
                    'timestamp': latest_reading.timestamp,
                    'is_alert': latest_reading.is_alert
                }

            sensors_data.append(sensor_data)

        return Response({
            'transformer_id': transformer.id,
            'transformer_name': transformer.name,
            'depot_name': transformer.depot.name,
            'region_name': transformer.region.name,
            'sensors': sensors_data
        })
    except Transformer.DoesNotExist:
        return Response({'error': 'Transformer not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transformer_alerts(request, transformer_id):
    """Get alerts for a specific transformer"""
    try:
        transformer = Transformer.objects.get(id=transformer_id)

        # Check if user has access to this transformer
        user_profile = request.user.profile
        has_access = False

        if user_profile.is_national_level:
            has_access = True
        elif user_profile.is_region_level and user_profile.region == transformer.region:
            has_access = True
        elif user_profile.is_depot_level and user_profile.depot == transformer.depot:
            has_access = True

        if not has_access:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # Get recent alerts for sensors in this transformer
        alerts = []
        for sensor in transformer.sensors.all():
            recent_alerts = sensor.readings.filter(is_alert=True).order_by('-timestamp')[:10]
            for alert in recent_alerts:
                alerts.append({
                    'sensor_id': sensor.id,
                    'sensor_name': sensor.name,
                    'sensor_type': sensor.sensor_type,
                    'value': float(alert.value),
                    'timestamp': alert.timestamp,
                    'message': f'Alert on {sensor.name}: {alert.value} ({sensor.sensor_type})'
                })

        # Sort alerts by timestamp (newest first)
        alerts.sort(key=lambda x: x['timestamp'], reverse=True)

        return Response({
            'transformer_id': transformer.id,
            'transformer_name': transformer.name,
            'alerts': alerts
        })
    except Transformer.DoesNotExist:
        return Response({'error': 'Transformer not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)