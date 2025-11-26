from django.core.management.base import BaseCommand
from api.models import Sensor, SensorReading
import random
from datetime import datetime
import pytz


class Command(BaseCommand):
    help = 'Generate sample sensor readings for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of sensor readings to create'
        )

    def handle(self, *args, **options):
        count = options['count']
        sensors = Sensor.objects.all()
        
        if not sensors.exists():
            self.stdout.write(
                self.style.ERROR('No sensors found. Please create some sensors first.')
            )
            return

        created_count = 0
        for i in range(count):
            sensor = sensors.order_by('?').first()  # Random sensor
            
            # Generate realistic values based on sensor type
            if sensor.sensor_type == 'temperature':
                value = round(random.uniform(20, 100), 2)  # Temperature in Celsius
                is_alert = value > 80  # Alert if temperature too high
            elif sensor.sensor_type == 'oil_level':
                value = round(random.uniform(0, 100), 2)  # Oil level percentage
                is_alert = value < 20  # Alert if oil level too low
            elif sensor.sensor_type == 'pressure':
                value = round(random.uniform(1, 10), 2)  # Pressure in bar
                is_alert = value > 8  # Alert if pressure too high
            elif sensor.sensor_type == 'current':
                value = round(random.uniform(0, 500), 2)  # Current in Amperes
                is_alert = value > 450  # Alert if current too high
            elif sensor.sensor_type == 'voltage':
                value = round(random.uniform(200, 250), 2)  # Voltage in Volts
                is_alert = value < 210 or value > 240  # Alert if voltage out of range
            else:
                value = round(random.uniform(0, 100), 2)
                is_alert = False

            SensorReading.objects.create(
                sensor=sensor,
                value=value,
                is_alert=is_alert
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} sensor readings'
            )
        )