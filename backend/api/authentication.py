from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User

class EmailBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Try to find user by username or email
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=username)
            except User.DoesNotExist:
                return None
        
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def user_can_authenticate(self, user):
        """
        Return True if the user is allowed to authenticate.
        """
        return (
            user.is_active and
            not (user.is_anonymous or user.is_staff or user.is_superuser)
        )