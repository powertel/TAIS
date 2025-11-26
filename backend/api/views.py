from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User, Group, Permission
from django.contrib.auth import authenticate, login
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from .models import Region, Depot, Transformer, Sensor, UserProfile, SensorReading
from .serializers import (
    UserSerializer, GroupSerializer, PermissionSerializer,
    RegionSerializer, DepotSerializer, TransformerSerializer, SensorSerializer,
    UserProfileSerializer, SensorReadingSerializer
)
from django.contrib.contenttypes.models import ContentType
from rest_framework_simplejwt.tokens import RefreshToken
from .permissions import HasModelPermission, ZesaAccessPermission


class LoginViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            refresh = RefreshToken.for_user(user)
            return Response({
                'success': True,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            })
        else:
            return Response({
                'success': False,
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'])
    def logout(self, request):
        try:
            # In a real application, you might want to blacklist the token
            # Here we just return a success response
            return Response({'success': True})
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'user_access'

    def get_permissions(self):
        # Allow unauthenticated users to create accounts
        if self.action == 'create':
            permission_classes = []
        else:
            permission_classes = [ZesaAccessPermission]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        user = serializer.save()
        # Create a UserProfile for the new user
        UserProfile.objects.create(user=user)

    

    @action(detail=False, methods=['get'], url_path='me/permissions', permission_classes=[IsAuthenticated])
    def my_permissions(self, request):
        user = request.user
        perms = list(user.get_all_permissions())
        return Response({'permissions': perms})


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'region_access'


class DepotViewSet(viewsets.ModelViewSet):
    queryset = Depot.objects.all()
    serializer_class = DepotSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'depot_access'


class TransformerViewSet(viewsets.ModelViewSet):
    queryset = Transformer.objects.all()
    serializer_class = TransformerSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'transformer_access'


class SensorViewSet(viewsets.ModelViewSet):
    queryset = Sensor.objects.all()
    serializer_class = SensorSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'sensor_access'


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'userprofile_access'


class SensorReadingViewSet(viewsets.ModelViewSet):
    queryset = SensorReading.objects.all()
    serializer_class = SensorReadingSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'sensorreading_access'


# Item model has been removed, so ItemViewSet is no longer needed


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [HasModelPermission]
    required_permission = 'group_access'


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [HasModelPermission]
    required_permission = 'permission_access'