from django.db import models
from django.contrib.auth.models import User


class Region(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Regions"
        ordering = ['name']

    def __str__(self):
        return self.name


class Depot(models.Model):
    name = models.CharField(max_length=100)
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='depots')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Depots"
        ordering = ['name']
        unique_together = [['name', 'region']]

    def __str__(self):
        return f"{self.name} ({self.region.name})"


class Transformer(models.Model):
    name = models.CharField(max_length=100)
    transformer_id = models.CharField(max_length=50, unique=True)  # Unique identifier for the transformer
    depot = models.ForeignKey(Depot, on_delete=models.CASCADE, related_name='transformers')
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='transformers')
    installation_date = models.DateField(null=True, blank=True)
    capacity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Transformer capacity in MVA")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Transformers"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.transformer_id})"


class Sensor(models.Model):
    SENSOR_TYPES = [
        ('temperature', 'Temperature'),
        ('oil_level', 'Oil Level'),
        ('pressure', 'Pressure'),
        ('current', 'Current'),
        ('voltage', 'Voltage'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=100)
    sensor_id = models.CharField(max_length=50, unique=True)
    transformer = models.ForeignKey(Transformer, on_delete=models.CASCADE, related_name='sensors')
    sensor_type = models.CharField(max_length=20, choices=SENSOR_TYPES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Sensors"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.sensor_id}) - {self.transformer.name}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    depot = models.ForeignKey(Depot, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    is_national_level = models.BooleanField(default=False, help_text="User can access all regions, depots, and transformers")
    is_region_level = models.BooleanField(default=False, help_text="User can access all transformers in their assigned region")
    is_depot_level = models.BooleanField(default=False, help_text="User can access only transformers in their assigned depot")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User Profiles"
        ordering = ['user__username']

    def __str__(self):
        return f"{self.user.username} Profile"

    def save(self, *args, **kwargs):
        # Ensure only one access level is set at a time to prevent conflicts
        if self.is_national_level:
            self.is_region_level = False
            self.is_depot_level = False
        elif self.is_region_level:
            self.is_national_level = False
            self.is_depot_level = False
        elif self.is_depot_level:
            self.is_national_level = False
            self.is_region_level = False

        super().save(*args, **kwargs)


class SensorReading(models.Model):
    """
    Model to store real-time sensor readings for monitoring transformers
    """
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='readings')
    value = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_alert = models.BooleanField(default=False, help_text="Indicates if this reading triggered an alert")

    class Meta:
        verbose_name_plural = "Sensor Readings"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.sensor.name} - {self.value} at {self.timestamp}"