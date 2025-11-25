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
        ('current', 'Current'),
        ('voltage', 'Voltage'),
        ('humidity', 'Humidity'),
        ('contact', 'Contact'),
        ('motion', 'Motion'),
        ('tilt', 'Tilt'),
        ('video', 'Video'),
        ('oil_level', 'Oil Level'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=100)
    sensor_id = models.CharField(max_length=50, unique=True)
    transformer = models.ForeignKey(Transformer, on_delete=models.CASCADE, related_name='sensors')
    sensor_type = models.CharField(max_length=20, choices=SENSOR_TYPES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    dev_eui = models.CharField(max_length=32, blank=True)
    fport = models.PositiveSmallIntegerField(null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Sensors"
        ordering = ['name']
        unique_together = [['dev_eui', 'fport']]

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
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='readings', null=True, blank=True)
    value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_alert = models.BooleanField(default=False)
    topic = models.CharField(max_length=255, blank=True, null=True)
    raw_payload = models.JSONField(default=dict)
    decoded = models.JSONField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "Sensor Readings"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['sensor', 'received_at']),
            models.Index(fields=['received_at']),
        ]

    def __str__(self):
        return f"{self.sensor.name} - {self.value} at {self.timestamp}"


class Device(models.Model):
    name = models.CharField(max_length=100)
    deveui = models.CharField(max_length=32, unique=True)
    client_id = models.CharField(max_length=100, blank=True)
    codec = models.CharField(max_length=50, blank=True, default='')
    transformer = models.ForeignKey(Transformer, on_delete=models.CASCADE, related_name='devices', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.deveui})"


class DeviceSensorMap(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='sensor_maps')
    port = models.IntegerField()
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='device_maps')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['device', 'port']]
        ordering = ['device__deveui', 'port']

    def __str__(self):
        return f"{self.device.deveui}:{self.port} -> {self.sensor.sensor_id}"


class DeviceUplink(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='uplinks')
    port = models.IntegerField()
    topic = models.CharField(max_length=200)
    raw = models.JSONField(default=dict)
    value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    ts_device = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.device.deveui}:{self.port} @ {self.received_at}"