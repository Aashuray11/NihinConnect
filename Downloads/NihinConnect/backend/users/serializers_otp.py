from rest_framework import serializers
from django.utils import timezone
from .models import OTP, CustomUser


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(required=False, allow_blank=True)


class OTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

    def validate(self, attrs):
        email = attrs.get('email')
        code = attrs.get('code')
        try:
            user = CustomUser.objects.get(email__iexact=email)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError('User not found for this email')

        try:
            otp = OTP.objects.filter(user=user, code=code, used=False).order_by('-created_at').first()
        except OTP.DoesNotExist:
            otp = None

        if not otp:
            raise serializers.ValidationError('Invalid OTP')
        if otp.is_expired():
            raise serializers.ValidationError('OTP has expired')

        attrs['user'] = user
        attrs['otp'] = otp
        return attrs
