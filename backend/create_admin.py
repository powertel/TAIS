import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Create superuser
admin_user = User.objects.create_superuser(
    username='admin',
    email='admin@example.com',
    password='admin123',
    is_staff=True,
    is_superuser=True
)

print("Superuser 'admin' created successfully!")