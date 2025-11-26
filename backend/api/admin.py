from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import Region, Depot, Transformer, Sensor, UserProfile, SensorReading


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'description', 'created_at', 'updated_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']


@admin.register(Depot)
class DepotAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'region', 'description', 'created_at', 'updated_at']
    search_fields = ['name', 'description', 'region__name']
    list_filter = ['region', 'created_at']


@admin.register(Transformer)
class TransformerAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'transformer_id', 'depot', 'region',
        'capacity', 'is_active', 'created_at', 'updated_at'
    ]
    search_fields = ['name', 'transformer_id', 'depot__name', 'region__name']
    list_filter = ['is_active', 'depot__region', 'depot', 'created_at']


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'sensor_id', 'transformer', 'sensor_type',
        'is_active', 'created_at', 'updated_at'
    ]
    search_fields = ['name', 'sensor_id', 'transformer__name', 'sensor_type']
    list_filter = ['is_active', 'sensor_type', 'transformer__depot__region', 'transformer__depot']


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ['id', 'sensor', 'value', 'timestamp', 'is_alert']
    search_fields = ['sensor__name', 'sensor__sensor_id']
    list_filter = ['is_alert', 'timestamp', 'sensor__sensor_type']
    date_hierarchy = 'timestamp'


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'User Profile'


class UserAdminWithProfile(UserAdmin):
    inlines = (UserProfileInline,)


# Unregister the old User admin and register the new one
admin.site.unregister(User)
admin.site.register(User, UserAdminWithProfile)
