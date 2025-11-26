from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User, Group, Permission
from django.contrib.auth import authenticate, login
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from django.shortcuts import render, redirect
from django.urls import reverse
from .models import Region, Depot, Transformer, Sensor, UserProfile, SensorReading, Device, DeviceSensorMap, DeviceUplink
from .serializers import (
    UserSerializer, GroupSerializer, PermissionSerializer,
    RegionSerializer, DepotSerializer, TransformerSerializer, SensorSerializer,
    UserProfileSerializer, SensorReadingSerializer,
    DeviceSerializer, DeviceSensorMapSerializer, DeviceUplinkSerializer
)
from django.contrib.contenttypes.models import ContentType
from rest_framework_simplejwt.tokens import RefreshToken
from .permissions import HasModelPermission, ZesaAccessPermission
from .realtime_views import push_sensor_update
from django.utils import timezone
from datetime import timedelta


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


def api_login_page(request):
    if request.method == 'POST':
        username = request.POST.get('username', '')
        password = request.POST.get('password', '')
        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            access = str(refresh.access_token)
            request.session['api_access'] = access
            request.session['api_refresh'] = str(refresh)
            request.session['api_username'] = user.username
            return redirect('api-console')
        return render(request, 'api/login.html', {'error': 'Invalid credentials'})
    return render(request, 'api/login.html')


def api_logout_page(request):
    try:
        request.session.flush()
    except Exception:
        pass
    return redirect('api-login')


def api_console(request):
    token = request.session.get('api_access')
    username = request.session.get('api_username')
    if not token:
        return redirect('api-login')
    base = request.build_absolute_uri('/')
    endpoints = [
        ('devices', '/devices/'),
        ('device-uplinks', '/device-uplinks/'),
        ('device-maps', '/device-maps/'),
        ('sensor-readings', '/sensor-readings/'),
        ('realtime stream', '/realtime/stream/'),
        ('realtime latest', '/realtime/latest/'),
    ]
    if request.method == 'POST' and request.POST.get('action') == 'set_codec':
        deveui = request.POST.get('deveui', '').strip()
        codec = request.POST.get('codec', '').strip()
        updated = False
        if deveui and codec:
            from .models import Device
            obj = Device.objects.filter(deveui=deveui).first()
            if obj:
                obj.codec = codec
                obj.save()
                updated = True
        return render(request, 'api/console.html', {
            'token': token,
            'username': username,
            'base': base,
            'endpoints': endpoints,
            'updated': updated,
        })
    return render(request, 'api/console.html', {
        'token': token,
        'username': username,
        'base': base,
        'endpoints': endpoints,
    })

def api_console_telemetry(request):
    token = request.session.get('api_access')
    username = request.session.get('api_username')
    if not token:
        return redirect('api-login')
    deveui = request.GET.get('deveui', '').strip()
    port_raw = request.GET.get('port', '').strip()
    port = None
    try:
        if port_raw:
            port = int(port_raw)
    except ValueError:
        port = None
    base = request.build_absolute_uri('/')
    device = None
    if deveui:
        device = Device.objects.filter(deveui__iexact=deveui).first()
    qs = DeviceUplink.objects.all()
    if device:
        qs = qs.filter(device=device)
    if port is not None:
        qs = qs.filter(port=port)
    qs = qs.order_by('-received_at')[:100]
    uplinks = list(qs)
    minutes_raw = request.GET.get('minutes', '60').strip()
    try:
        minutes = int(minutes_raw)
    except Exception:
        minutes = 60
    cutoff = timezone.now() - timedelta(minutes=minutes)
    recent_devices = Device.objects.filter(last_seen__gte=cutoff).order_by('-last_seen')[:100]
    expected_sensor_name = None
    if deveui and port is not None:
        expected_sensor_name = f"{deveui} Port {port}"
    if request.method == 'POST' and request.POST.get('action') == 'inject':
        hex_data = request.POST.get('hex', '').strip()
        import re, base64
        def to_bytes(s):
            if not s:
                return None
            s = s.strip()
            if re.fullmatch(r'[0-9A-Fa-f\s]+', s):
                s = s.replace(' ', '')
                try:
                    return bytes.fromhex(s)
                except Exception:
                    return None
            try:
                return base64.b64decode(s, validate=False)
            except Exception:
                return None
        def decode_lpp(buf):
            if not buf:
                return {'records': [], 'primary_value': None}
            i = 0
            out = []
            while i + 2 <= len(buf):
                ch = buf[i]; t = buf[i+1]; i += 2
                if t in (0x02,0x03,0x67):
                    if i + 2 > len(buf): break
                    b0,b1 = buf[i],buf[i+1]; i += 2
                    be = ((b0<<8)|b1); be = be - 0x10000 if be>=0x8000 else be
                    le = ((b1<<8)|b0); le = le - 0x10000 if le>=0x8000 else le
                    if t in (0x02,0x03):
                        out.append({'channel':ch,'type':t,'value_be':be/100.0,'value_le':le/100.0,'name':'analog'})
                    elif t==0x67:
                        out.append({'channel':ch,'type':t,'value_be':be/10.0,'value_le':le/10.0,'name':'temperature'})
                elif t in (0x00,0x01,0x68):
                    if i + 1 > len(buf): break
                    b = buf[i]; i += 1
                    if t==0x68: out.append({'channel':ch,'type':t,'value':(b/2.0),'name':'humidity'})
                    elif t==0x00: out.append({'channel':ch,'type':t,'value':int(b),'name':'digital_in'})
                    elif t==0x01: out.append({'channel':ch,'type':t,'value':int(b),'name':'digital_out'})
                else:
                    break
            best = None
            for rec in out:
                if rec.get('name')=='temperature':
                    v = rec.get('value_le');
                    if v is not None and -50.0<=v<=85.0: best=v; break
                    v = rec.get('value_be');
                    if v is not None and -50.0<=v<=85.0: best=v; break
            if best is None:
                for rec in out:
                    if rec.get('name')=='humidity': best=rec.get('value'); break
            if best is None:
                for rec in out:
                    if rec.get('name') in ['analog','digital_in','digital_out']:
                        v = rec.get('value') or rec.get('value_le') or rec.get('value_be')
                        if v is not None: best=v; break
            return {'records':out,'primary_value':best}
        buf = to_bytes(hex_data)
        decoded = decode_lpp(buf)
        if deveui and port is not None:
            device, _ = Device.objects.get_or_create(deveui=deveui, defaults={'name': deveui})
            if device.transformer is None:
                region, _ = Region.objects.get_or_create(name='Unassigned')
                depot, _ = Depot.objects.get_or_create(name='Unassigned Depot', region=region)
                transformer, _ = Transformer.objects.get_or_create(transformer_id='UNASSIGNED', defaults={'name':'Unassigned Transformer','region':region,'depot':depot,'capacity':0})
                device.transformer = transformer
                device.save()
            sensor, _ = Sensor.objects.get_or_create(sensor_id=f"{deveui}-{port}", transformer=device.transformer, defaults={'name':f"{deveui} Port {port}", 'sensor_type':'other'})
            DeviceSensorMap.objects.get_or_create(device=device, port=port, sensor=sensor)
            device.metadata = {**(device.metadata or {}), 'last_port':port, 'codec':'cayenne', 'last_decoded':decoded, 'last_value':decoded.get('primary_value')}
            device.save()
            DeviceUplink.objects.create(device=device, port=port, topic=f"powerteltais/{deveui}/{port}", raw={'data':hex_data, 'decoded_vendor':decoded}, value=decoded.get('primary_value'))
            try:
                push_sensor_update(sensor.id, decoded.get('primary_value'), False)
            except Exception:
                pass
            try:
                from .realtime_views import push_device_update
                push_device_update(device.id, port=port, value=decoded.get('primary_value'), codec='cayenne')
            except Exception:
                pass
        return redirect(f"{reverse('api-telemetry')}?deveui={deveui}&port={port}")

    return render(request, 'api/telemetry.html', {
        'token': token,
        'username': username,
        'base': base,
        'deveui': deveui,
        'port': (port if port is not None else ''),
        'uplinks': uplinks,
        'expected_sensor_name': expected_sensor_name,
        'recent_devices': recent_devices,
        'minutes': minutes,
    })

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


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'device_access'

    @action(detail=False, methods=['get'], url_path='online', permission_classes=[ZesaAccessPermission])
    def online(self, request):
        minutes_raw = request.query_params.get('minutes', '60').strip()
        try:
            minutes = int(minutes_raw)
        except Exception:
            minutes = 60
        cutoff = timezone.now() - timedelta(minutes=minutes)
        qs = Device.objects.filter(last_seen__gte=cutoff).order_by('-last_seen')
        data = DeviceSerializer(qs, many=True).data
        return Response({'minutes': minutes, 'count': qs.count(), 'devices': data})


class DeviceSensorMapViewSet(viewsets.ModelViewSet):
    queryset = DeviceSensorMap.objects.all()
    serializer_class = DeviceSensorMapSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'devicesensormap_access'


class DeviceUplinkViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DeviceUplink.objects.all()
    serializer_class = DeviceUplinkSerializer
    permission_classes = [ZesaAccessPermission]
    required_permission = 'deviceuplink_access'


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