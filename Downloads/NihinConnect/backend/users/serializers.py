from rest_framework import serializers
from django.conf import settings
from .models import CustomUser, FriendRequest
from .models import Notification


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = ('name', 'email', 'password')

    def validate_email(self, value):
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = CustomUser.objects.create_user(password=password, **validated_data)
        return user


class FriendSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ('id', 'name', 'email', 'avatar')

    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            try:
                url = obj.avatar.url
            except Exception:
                return None
            # If a request is present, prefer build_absolute_uri so host/scheme
            # match the incoming request (works for ngrok when headers are
            # forwarded). If no request is present, attempt to return a fully
            # qualified URL using EXTERNAL_BASE_URL as a fallback.
            # Build absolute URI when we have a request.
            if request:
                try:
                    abs_url = request.build_absolute_uri(url)
                    # append a cache-busting version based on updated_at
                    if getattr(obj, 'updated_at', None):
                        ts = int(obj.updated_at.timestamp())
                        sep = '&' if '?' in abs_url else '?'
                        return f"{abs_url}{sep}v={ts}"
                    return abs_url
                except Exception:
                    pass
            # If url is already absolute, append version and return it
            if isinstance(url, str) and (url.startswith('http://') or url.startswith('https://')):
                if getattr(obj, 'updated_at', None):
                    ts = int(obj.updated_at.timestamp())
                    sep = '&' if '?' in url else '?'
                    return f"{url}{sep}v={ts}"
                return url
            # Fallback to EXTERNAL_BASE_URL from settings
            external = getattr(settings, 'EXTERNAL_BASE_URL', '')
            if external:
                out = external.rstrip('/') + url
                if getattr(obj, 'updated_at', None):
                    ts = int(obj.updated_at.timestamp())
                    sep = '&' if '?' in out else '?'
                    return f"{out}{sep}v={ts}"
                return out
            return url
        return None


class FriendRequestSerializer(serializers.ModelSerializer):
    sender = FriendSerializer(read_only=True)
    receiver = FriendSerializer(read_only=True)

    class Meta:
        model = FriendRequest
        fields = ('id', 'sender', 'receiver', 'status', 'created_at')


class ProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ('id', 'name', 'email', 'avatar', 'created_at', 'updated_at', 'location', 'phone', 'school', 'bio', 'slogan')

    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            try:
                url = obj.avatar.url
            except Exception:
                return None
            if request:
                try:
                    abs_url = request.build_absolute_uri(url)
                    if getattr(obj, 'updated_at', None):
                        ts = int(obj.updated_at.timestamp())
                        sep = '&' if '?' in abs_url else '?'
                        return f"{abs_url}{sep}v={ts}"
                    return abs_url
                except Exception:
                    pass
            if isinstance(url, str) and (url.startswith('http://') or url.startswith('https://')):
                if getattr(obj, 'updated_at', None):
                    ts = int(obj.updated_at.timestamp())
                    sep = '&' if '?' in url else '?'
                    return f"{url}{sep}v={ts}"
                return url
            external = getattr(settings, 'EXTERNAL_BASE_URL', '')
            if external:
                out = external.rstrip('/') + url
                if getattr(obj, 'updated_at', None):
                    ts = int(obj.updated_at.timestamp())
                    sep = '&' if '?' in out else '?'
                    return f"{out}{sep}v={ts}"
                return out
            return url
        return None


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('name', 'avatar', 'location', 'phone', 'school', 'bio', 'slogan')

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class NotificationSerializer(serializers.ModelSerializer):
    actor = FriendSerializer(read_only=True)
    target_type = serializers.SerializerMethodField()
    target_id = serializers.IntegerField(source='object_id', read_only=True)

    class Meta:
        model = Notification
        fields = ('id', 'actor', 'verb', 'unread', 'created_at', 'target_type', 'target_id')

    def get_target_type(self, obj):
        if obj.content_type:
            return obj.content_type.model
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender = FriendSerializer(read_only=True)
    receiver = FriendSerializer(read_only=True)

    class Meta:
        model = None
        fields = ('id', 'sender', 'receiver', 'text', 'created_at', 'edited', 'edited_at', 'is_read')

    def to_representation(self, instance):
        # lazy-import to avoid circular import
        from .models import Message
        self.Meta.model = Message
        return super().to_representation(instance)
