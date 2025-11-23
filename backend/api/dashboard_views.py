from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Max, Min
from django.contrib.auth.models import User
from .models import Region, Depot, Transformer, Sensor, SensorReading, UserProfile
from .serializers import (
    RegionSerializer, DepotSerializer, TransformerSerializer,
    SensorSerializer, SensorReadingSerializer
)
from .permissions import ZesaAccessPermission


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def hierarchy(self, request):
        """
        Get the complete hierarchy based on user's access level
        """
        user = request.user
        
        try:
            user_profile = user.profile
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # National level user - get everything
        if user_profile.is_national_level:
            regions = Region.objects.all()
            data = []
            for region in regions:
                region_data = {
                    'id': region.id,
                    'name': region.name,
                    'description': region.description,
                    'depots': []
                }
                depots = Depot.objects.filter(region=region)
                for depot in depots:
                    depot_data = {
                        'id': depot.id,
                        'name': depot.name,
                        'description': depot.description,
                        'transformers': []
                    }
                    transformers = Transformer.objects.filter(depot=depot)
                    for transformer in transformers:
                        transformer_data = {
                            'id': transformer.id,
                            'name': transformer.name,
                            'transformer_id': transformer.transformer_id,
                            'capacity': float(transformer.capacity),
                            'is_active': transformer.is_active,
                            'sensor_count': transformer.sensors.count()
                        }
                        depot_data['transformers'].append(transformer_data)
                    region_data['depots'].append(depot_data)
                data.append(region_data)
        
        # Region level user - get only assigned region
        elif user_profile.is_region_level and user_profile.region:
            region = user_profile.region
            region_data = {
                'id': region.id,
                'name': region.name,
                'description': region.description,
                'depots': []
            }
            depots = Depot.objects.filter(region=region)
            for depot in depots:
                depot_data = {
                    'id': depot.id,
                    'name': depot.name,
                    'description': depot.description,
                    'transformers': []
                }
                transformers = Transformer.objects.filter(depot=depot)
                for transformer in transformers:
                    transformer_data = {
                        'id': transformer.id,
                        'name': transformer.name,
                        'transformer_id': transformer.transformer_id,
                        'capacity': float(transformer.capacity),
                        'is_active': transformer.is_active,
                        'sensor_count': transformer.sensors.count()
                    }
                    depot_data['transformers'].append(transformer_data)
                region_data['depots'].append(depot_data)
            data = [region_data]
        
        # Depot level user - get only assigned depot
        elif user_profile.is_depot_level and user_profile.depot:
            depot = user_profile.depot
            depot_data = {
                'id': depot.id,
                'name': depot.name,
                'description': depot.description,
                'region': {
                    'id': depot.region.id,
                    'name': depot.region.name
                },
                'transformers': []
            }
            transformers = Transformer.objects.filter(depot=depot)
            for transformer in transformers:
                transformer_data = {
                    'id': transformer.id,
                    'name': transformer.name,
                    'transformer_id': transformer.transformer_id,
                    'capacity': float(transformer.capacity),
                    'is_active': transformer.is_active,
                    'sensor_count': transformer.sensors.count()
                }
                depot_data['transformers'].append(transformer_data)
            data = [{'id': depot.region.id, 'name': depot.region.name, 'depots': [depot_data]}]
        
        # Default case
        else:
            data = []

        return Response(data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get dashboard statistics based on user's access level
        """
        user = request.user
        
        try:
            user_profile = user.profile
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)

        stats = {}

        # Count based on access level
        if user_profile.is_national_level:
            stats = {
                'total_regions': Region.objects.count(),
                'total_depots': Depot.objects.count(),
                'total_transformers': Transformer.objects.count(),
                'total_sensors': Sensor.objects.count(),
                'active_transformers': Transformer.objects.filter(is_active=True).count(),
                'inactive_transformers': Transformer.objects.filter(is_active=False).count()
            }
        elif user_profile.is_region_level and user_profile.region:
            region = user_profile.region
            stats = {
                'total_regions': 1,  # Just the assigned region
                'total_depots': Depot.objects.filter(region=region).count(),
                'total_transformers': Transformer.objects.filter(region=region).count(),
                'total_sensors': Sensor.objects.filter(transformer__region=region).count(),
                'active_transformers': Transformer.objects.filter(region=region, is_active=True).count(),
                'inactive_transformers': Transformer.objects.filter(region=region, is_active=False).count()
            }
        elif user_profile.is_depot_level and user_profile.depot:
            depot = user_profile.depot
            stats = {
                'total_regions': 0,  # Not applicable for depot level
                'total_depots': 1,  # Just the assigned depot
                'total_transformers': Transformer.objects.filter(depot=depot).count(),
                'total_sensors': Sensor.objects.filter(transformer__depot=depot).count(),
                'active_transformers': Transformer.objects.filter(depot=depot, is_active=True).count(),
                'inactive_transformers': Transformer.objects.filter(depot=depot, is_active=False).count()
            }
        else:
            stats = {
                'total_regions': 0,
                'total_depots': 0,
                'total_transformers': 0,
                'total_sensors': 0,
                'active_transformers': 0,
                'inactive_transformers': 0
            }

        return Response(stats)

    @action(detail=False, methods=['get'])
    def transformer_status(self, request):
        """
        Get transformer status information based on user's access level
        """
        user = request.user
        
        try:
            user_profile = user.profile
        except UserProfile.DoesNotExist:
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

        transformer_data = []
        for transformer in transformers:
            # Get the latest sensor readings for this transformer
            latest_readings = []
            for sensor in transformer.sensors.all()[:5]:  # Get first 5 sensors for performance
                latest_reading = sensor.readings.order_by('-timestamp').first()
                if latest_reading:
                    latest_readings.append({
                        'sensor_name': sensor.name,
                        'sensor_type': sensor.sensor_type,
                        'value': float(latest_reading.value),
                        'timestamp': latest_reading.timestamp,
                        'is_alert': latest_reading.is_alert
                    })

            transformer_data.append({
                'id': transformer.id,
                'name': transformer.name,
                'transformer_id': transformer.transformer_id,
                'depot_name': transformer.depot.name,
                'region_name': transformer.region.name,
                'capacity': float(transformer.capacity),
                'is_active': transformer.is_active,
                'latest_readings': latest_readings,
                'sensor_count': transformer.sensors.count()
            })

        return Response(transformer_data)

    @action(detail=True, methods=['get'])
    def transformer_detail(self, request, pk=None):
        """
        Get detailed information for a specific transformer
        """
        user = request.user
        
        try:
            user_profile = user.profile
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            transformer = Transformer.objects.get(id=pk)
        except Transformer.DoesNotExist:
            return Response({'error': 'Transformer not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if user has access to this transformer
        if not ZesaAccessPermission._has_transformer_access(user_profile, transformer):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # Get transformer details
        transformer_data = {
            'id': transformer.id,
            'name': transformer.name,
            'transformer_id': transformer.transformer_id,
            'depot_name': transformer.depot.name,
            'region_name': transformer.region.name,
            'capacity': float(transformer.capacity),
            'installation_date': transformer.installation_date,
            'description': transformer.description,
            'is_active': transformer.is_active,
            'sensor_count': transformer.sensors.count(),
            'sensors': []
        }

        # Get all sensor data for this transformer
        for sensor in transformer.sensors.all():
            sensor_data = {
                'id': sensor.id,
                'name': sensor.name,
                'sensor_id': sensor.sensor_id,
                'sensor_type': sensor.sensor_type,
                'description': sensor.description,
                'is_active': sensor.is_active,
                'latest_reading': None,
                'readings_count': sensor.readings.count()
            }

            # Get the latest reading
            latest_reading = sensor.readings.order_by('-timestamp').first()
            if latest_reading:
                sensor_data['latest_reading'] = {
                    'value': float(latest_reading.value),
                    'timestamp': latest_reading.timestamp,
                    'is_alert': latest_reading.is_alert
                }

            transformer_data['sensors'].append(sensor_data)

        # Get recent readings for charting
        recent_readings = SensorReading.objects.filter(
            sensor__transformer=transformer
        ).order_by('-timestamp')[:50]  # Last 50 readings

        readings_data = []
        for reading in recent_readings:
            readings_data.append({
                'sensor_name': reading.sensor.name,
                'sensor_type': reading.sensor.sensor_type,
                'value': float(reading.value),
                'timestamp': reading.timestamp,
                'is_alert': reading.is_alert
            })

        transformer_data['recent_readings'] = readings_data

        return Response(transformer_data)