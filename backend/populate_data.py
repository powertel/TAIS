import os
import django
from datetime import date

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Region, Depot, Transformer, Sensor, UserProfile

User = get_user_model()

# Create sample regions
regions_data = [
    {'name': 'Harare Region', 'description': 'ZESA Region covering Harare and surrounding areas'},
    {'name': 'Bulawayo Region', 'description': 'ZESA Region covering Bulawayo and surrounding areas'},
    {'name': 'Masvingo Region', 'description': 'ZESA Region covering Masvingo and surrounding areas'},
    {'name': 'Manicaland Region', 'description': 'ZESA Region covering Manicaland province'},
    {'name': 'Mashonaland Central Region', 'description': 'ZESA Region covering Mashonaland Central province'},
]

regions = []
for region_data in regions_data:
    region, created = Region.objects.get_or_create(
        name=region_data['name'],
        defaults={'description': region_data['description']}
    )
    regions.append(region)
    print(f"Created region: {region.name}")

# Create sample depots for each region
depots_data = {
    'Harare Region': [
        {'name': 'Harare Central Depot', 'description': 'Main depot for Harare Central area'},
        {'name': 'Southerton Depot', 'description': 'Depot for Southerton area'},
        {'name': 'Mount Pleasant Depot', 'description': 'Depot for Mount Pleasant area'},
    ],
    'Bulawayo Region': [
        {'name': 'Bulawayo Central Depot', 'description': 'Main depot for Bulawayo Central area'},
        {'name': 'Pelandaba Depot', 'description': 'Depot for Pelandaba area'},
        {'name': 'United Bulawayo Depot', 'description': 'Depot for United Bulawayo area'},
    ],
    'Masvingo Region': [
        {'name': 'Masvingo Central Depot', 'description': 'Main depot for Masvingo Central area'},
        {'name': 'Chiredzi Depot', 'description': 'Depot for Chiredzi area'},
    ],
}

depots = []
for region_name, depot_list in depots_data.items():
    region = Region.objects.get(name=region_name)
    for depot_data in depot_list:
        depot, created = Depot.objects.get_or_create(
            name=depot_data['name'],
            region=region,
            defaults={'description': depot_data['description']}
        )
        depots.append(depot)
        print(f"Created depot: {depot.name} in {region.name}")

# Create sample transformers for each depot
transformers_data = [
    # Harare transformers
    {'name': 'Harare CBD Transformer', 'transformer_id': 'HCB001', 'depot': 'Harare Central Depot', 'region': 'Harare Region', 'capacity': 50.00},
    {'name': 'Southerton Commercial Transformer', 'transformer_id': 'SCO001', 'depot': 'Southerton Depot', 'region': 'Harare Region', 'capacity': 30.00},
    {'name': 'Mount Pleasant Residential Transformer', 'transformer_id': 'MPR001', 'depot': 'Mount Pleasant Depot', 'region': 'Harare Region', 'capacity': 25.00},
    
    # Bulawayo transformers
    {'name': 'Bulawayo CBD Transformer', 'transformer_id': 'BCB001', 'depot': 'Bulawayo Central Depot', 'region': 'Bulawayo Region', 'capacity': 45.00},
    {'name': 'Pelandaba Industrial Transformer', 'transformer_id': 'PIN001', 'depot': 'Pelandaba Depot', 'region': 'Bulawayo Region', 'capacity': 35.00},
    
    # Masvingo transformers
    {'name': 'Masvingo CBD Transformer', 'transformer_id': 'MCD001', 'depot': 'Masvingo Central Depot', 'region': 'Masvingo Region', 'capacity': 20.00},
]

transformers = []
for transformer_data in transformers_data:
    depot = Depot.objects.get(name=transformer_data['depot'])
    region = Region.objects.get(name=transformer_data['region'])
    transformer, created = Transformer.objects.get_or_create(
        transformer_id=transformer_data['transformer_id'],
        defaults={
            'name': transformer_data['name'],
            'depot': depot,
            'region': region,
            'capacity': transformer_data['capacity'],
            'installation_date': date.today(),
            'description': f"Transformer for {transformer_data['name']}"
        }
    )
    transformers.append(transformer)
    print(f"Created transformer: {transformer.name} at {depot.name}, {region.name}")

# Create sample sensors for each transformer
sensor_types = [
    ('temperature', 'Temperature Sensor'),
    ('oil_level', 'Oil Level Sensor'),
    ('pressure', 'Pressure Sensor'),
    ('current', 'Current Sensor'),
    ('voltage', 'Voltage Sensor'),
]

sensors = []
for transformer in transformers[:5]:  # Add sensors to first 5 transformers
    for i, (sensor_type, sensor_name) in enumerate(sensor_types, 1):
        sensor, created = Sensor.objects.get_or_create(
            sensor_id=f"{transformer.transformer_id}_{sensor_type[:3]}{i}",
            transformer=transformer,
            defaults={
                'name': f"{sensor_name} - {transformer.name}",
                'sensor_type': sensor_type,
                'description': f"{sensor_name} for {transformer.name}"
            }
        )
        sensors.append(sensor)
        print(f"Created sensor: {sensor.name} for {transformer.name}")

# Create sample users with different access levels
# National level user
national_user, created = User.objects.get_or_create(
    username='national_admin',
    defaults={
        'email': 'national@zesa.co.zw',
        'first_name': 'National',
        'last_name': 'Admin',
        'is_staff': True
    }
)
if created:
    national_user.set_password('national123')
    national_user.save()

national_profile, created = UserProfile.objects.get_or_create(
    user=national_user,
    defaults={
        'is_national_level': True
    }
)
print(f"Created national level user: {national_user.username}")

# Region level user for Harare
region_user, created = User.objects.get_or_create(
    username='harare_admin',
    defaults={
        'email': 'harare@zesa.co.zw',
        'first_name': 'Harare',
        'last_name': 'Admin',
        'is_staff': True
    }
)
if created:
    region_user.set_password('harare123')
    region_user.save()

harare_region = Region.objects.get(name='Harare Region')
region_profile, created = UserProfile.objects.get_or_create(
    user=region_user,
    defaults={
        'region': harare_region,
        'is_region_level': True
    }
)
print(f"Created region level user: {region_user.username} for {harare_region.name}")

# Depot level user for Harare Central Depot
depot_user, created = User.objects.get_or_create(
    username='hararecentral_operator',
    defaults={
        'email': 'hararecentral@zesa.co.zw',
        'first_name': 'Harare Central',
        'last_name': 'Operator',
        'is_staff': True
    }
)
if created:
    depot_user.set_password('depot123')
    depot_user.save()

harare_central_depot = Depot.objects.get(name='Harare Central Depot')
depot_profile, created = UserProfile.objects.get_or_create(
    user=depot_user,
    defaults={
        'depot': harare_central_depot,
        'is_depot_level': True
    }
)
print(f"Created depot level user: {depot_user.username} for {harare_central_depot.name}")

print("\nSample data creation completed successfully!")
print(f"Created {len(regions)} regions")
print(f"Created {len(depots)} depots")
print(f"Created {len(transformers)} transformers")
print(f"Created {len(sensors)} sensors")
print("Created 3 users with different access levels")