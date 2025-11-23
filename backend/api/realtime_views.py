from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Sensor, SensorReading, Transformer, UserProfile
from .permissions import ZesaAccessPermission
import json


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_realtime_data(request, transformer_id):
    """
    Get real-time sensor data for a specific transformer
    """
    user = request.user
    
    try:
        user_profile = user.profile
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        transformer = Transformer.objects.get(id=transformer_id)
    except Transformer.DoesNotExist:
        return Response({'error': 'Transformer not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if user has access to this transformer
    if not ZesaAccessPermission._has_transformer_access(user_profile, transformer):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    # Get the latest reading for each sensor of this transformer
    sensors = Sensor.objects.filter(transformer=transformer)
    data = []

    for sensor in sensors:
        latest_reading = sensor.readings.order_by('-timestamp').first()
        if latest_reading:
            data.append({
                'sensor_id': sensor.sensor_id,
                'sensor_name': sensor.name,
                'sensor_type': sensor.sensor_type,
                'value': float(latest_reading.value),
                'timestamp': latest_reading.timestamp.isoformat(),
                'is_alert': latest_reading.is_alert
            })

    return Response({
        'transformer_id': transformer.transformer_id,
        'transformer_name': transformer.name,
        'timestamp': data[0]['timestamp'] if data else None,
        'sensors_data': data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transformer_alerts(request, transformer_id):
    """
    Get recent alerts for a specific transformer
    """
    user = request.user
    
    try:
        user_profile = user.profile
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        transformer = Transformer.objects.get(id=transformer_id)
    except Transformer.DoesNotExist:
        return Response({'error': 'Transformer not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if user has access to this transformer
    if not ZesaAccessPermission._has_transformer_access(user_profile, transformer):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    # Get recent alerts for all sensors of this transformer
    alert_readings = SensorReading.objects.filter(
        sensor__transformer=transformer,
        is_alert=True
    ).order_by('-timestamp')[:20]  # Last 20 alerts

    alerts = []
    for reading in alert_readings:
        alerts.append({
            'id': reading.id,
            'sensor_name': reading.sensor.name,
            'sensor_type': reading.sensor.sensor_type,
            'value': float(reading.value),
            'timestamp': reading.timestamp.isoformat(),
            'message': f"Alert: {reading.sensor.name} reading ({reading.value}) exceeded threshold"
        })

    return Response({
        'transformer_id': transformer.transformer_id,
        'transformer_name': transformer.name,
        'total_alerts': len(alerts),
        'alerts': alerts
    })