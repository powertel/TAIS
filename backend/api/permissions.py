from rest_framework.permissions import BasePermission
from django.contrib.auth.models import User
from .models import Region, Depot, Transformer, Sensor, UserProfile


class HasModelPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        model = getattr(view.queryset, 'model', None)
        if model is None:
            return False

        app_label = model._meta.app_label
        model_name = model._meta.model_name

        action = (getattr(view, 'action', None) or 'list')
        if action in ('list', 'retrieve'):
            perm_codename = f'view_{model_name}'
        elif action in ('create',):
            perm_codename = f'add_{model_name}'
        elif action in ('update', 'partial_update'):
            perm_codename = f'change_{model_name}'
        elif action in ('destroy',):
            perm_codename = f'delete_{model_name}'
        else:
            perm_codename = f'view_{model_name}'

        full_perm = f'{app_label}.{perm_codename}'
        return user.has_perm(full_perm)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class ZesaAccessPermission(BasePermission):
    """
    Custom permission class to handle ZESA access levels:
    - National level: access to all regions, depots, transformers, sensors
    - Region level: access only to objects within the assigned region
    - Depot level: access only to objects within the assigned depot
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        # If user doesn't have a profile, deny access
        try:
            user_profile = user.profile
        except UserProfile.DoesNotExist:
            return False

        model = getattr(view.queryset, 'model', None)
        if model is None:
            return False

        # For list/retrieve actions, check access based on model type
        if hasattr(view, 'action') and view.action in ('list', 'retrieve'):
            return True  # We'll check object-level permissions later

        return True  # Let object-level permission check handle it

    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        try:
            user_profile = user.profile
        except UserProfile.DoesNotExist:
            return False

        # Check access based on the object type
        if isinstance(obj, Region):
            return self._has_region_access(user_profile, obj)
        elif isinstance(obj, Depot):
            return self._has_depot_access(user_profile, obj)
        elif isinstance(obj, Transformer):
            return self._has_transformer_access(user_profile, obj)
        elif isinstance(obj, Sensor):
            return self._has_sensor_access(user_profile, obj)
        elif isinstance(obj, UserProfile):
            return self._has_user_profile_access(user_profile, obj)
        elif isinstance(obj, User):
            return self._has_user_access(user_profile, obj)

        return True  # Default to allow for other models

    def _has_region_access(self, user_profile, region):
        # National level users can access all regions
        if user_profile.is_national_level:
            return True
        # Region level users can access their assigned region
        if user_profile.is_region_level and user_profile.region == region:
            return True
        return False

    def _has_depot_access(self, user_profile, depot):
        # National level users can access all depots
        if user_profile.is_national_level:
            return True
        # Region level users can access depots in their region
        if user_profile.is_region_level and depot.region == user_profile.region:
            return True
        # Depot level users can access their assigned depot
        if user_profile.is_depot_level and depot == user_profile.depot:
            return True
        return False

    def _has_transformer_access(self, user_profile, transformer):
        # National level users can access all transformers
        if user_profile.is_national_level:
            return True
        # Region level users can access transformers in their region
        if user_profile.is_region_level and transformer.region == user_profile.region:
            return True
        # Depot level users can access transformers in their assigned depot
        if user_profile.is_depot_level and transformer.depot == user_profile.depot:
            return True
        return False

    def _has_sensor_access(self, user_profile, sensor):
        # National level users can access all sensors
        if user_profile.is_national_level:
            return True
        # Region level users can access sensors of transformers in their region
        if user_profile.is_region_level and sensor.transformer.region == user_profile.region:
            return True
        # Depot level users can access sensors of transformers in their assigned depot
        if user_profile.is_depot_level and sensor.transformer.depot == user_profile.depot:
            return True
        return False

    def _has_user_profile_access(self, user_profile, target_profile):
        # National level users can manage all user profiles
        if user_profile.is_national_level:
            return True
        # For now, users can only see their own profile
        return user_profile.user == target_profile.user

    def _has_user_access(self, user_profile, target_user):
        # National level users can manage all users
        if user_profile.is_national_level:
            return True
        # Users can see their own profile
        return user_profile.user == target_user

    @staticmethod
    def _has_transformer_access(user_profile, transformer):
        # National level users can access all transformers
        if user_profile.is_national_level:
            return True
        # Region level users can access transformers in their region
        if user_profile.is_region_level and transformer.region == user_profile.region:
            return True
        # Depot level users can access transformers in their assigned depot
        if user_profile.is_depot_level and transformer.depot == user_profile.depot:
            return True
        return False