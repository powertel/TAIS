from rest_framework import serializers
from django.contrib.auth.models import User, Group, Permission
from .models import Region, Depot, Transformer, Sensor, UserProfile, SensorReading

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'password', 'is_active', 'date_joined', 'is_staff', 'is_superuser')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = '__all__'


class DepotSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source='region.name', read_only=True)

    class Meta:
        model = Depot
        fields = '__all__'


class TransformerSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source='region.name', read_only=True)
    depot_name = serializers.CharField(source='depot.name', read_only=True)

    class Meta:
        model = Transformer
        fields = '__all__'


class SensorSerializer(serializers.ModelSerializer):
    transformer_name = serializers.CharField(source='transformer.name', read_only=True)
    transformer_id_display = serializers.CharField(source='transformer.transformer_id', read_only=True)

    class Meta:
        model = Sensor
        fields = '__all__'


class UserProfileSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    region_name = serializers.CharField(source='region.name', read_only=True, allow_null=True)
    depot_name = serializers.CharField(source='depot.name', read_only=True, allow_null=True)

    class Meta:
        model = UserProfile
        fields = '__all__'


class SensorReadingSerializer(serializers.ModelSerializer):
    sensor_name = serializers.CharField(source='sensor.name', read_only=True)
    sensor_type = serializers.CharField(source='sensor.sensor_type', read_only=True)

    class Meta:
        model = SensorReading
        fields = '__all__'


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ('id', 'name', 'codename', 'content_type')

class GroupSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(queryset=Permission.objects.all(), many=True, required=False)

    class Meta:
        model = Group
        fields = ('id', 'name', 'permissions')

    def create(self, validated_data):
        perms = validated_data.pop('permissions', [])
        group = Group.objects.create(**validated_data)
        if perms:
            group.permissions.set(perms)
        return group

    def update(self, instance, validated_data):
        perms = validated_data.pop('permissions', None)
        instance.name = validated_data.get('name', instance.name)
        instance.save()
        if perms is not None:
            instance.permissions.set(perms)
        return instance