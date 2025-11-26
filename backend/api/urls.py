from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import dashboard_views
from . import realtime_views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'groups', views.GroupViewSet)
router.register(r'permissions', views.PermissionViewSet)
router.register(r'regions', views.RegionViewSet)
router.register(r'depots', views.DepotViewSet)
router.register(r'transformers', views.TransformerViewSet)
router.register(r'sensors', views.SensorViewSet)
router.register(r'user-profiles', views.UserProfileViewSet)
router.register(r'sensor-readings', views.SensorReadingViewSet)

router.register(r'auth', views.LoginViewSet, basename='auth')
router.register(r'dashboard', dashboard_views.DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
    path('realtime/transformer/<int:transformer_id>/', realtime_views.get_realtime_data, name='realtime-data'),
    path('realtime/transformer/<int:transformer_id>/alerts/', realtime_views.get_transformer_alerts, name='transformer-alerts'),
]