from rest_framework.permissions import BasePermission

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