from django.contrib.auth import authenticate
from django.utils import timezone
from django.core.mail import send_mail
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, parsers
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, OTP
from .serializers_otp import LoginSerializer, OTPRequestSerializer, OTPVerifySerializer
from .otp_utils import generate_otp_code, otp_expiry_time
from .serializers import ProfileSerializer, ProfileUpdateSerializer, FriendSerializer
from posts.models import Post
from .models import OTP
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    def options(self, request, *args, **kwargs):
        # Log OPTIONS requests (CORS preflight) for debugging 405 issues
        try:
            logger.info('LoginView OPTIONS received: path=%s headers=%s', request.path, dict(request.headers))
        except Exception:
            pass
        return super().options(request, *args, **kwargs)

    def post(self, request):
        # Log incoming POST metadata to help diagnose 405/Method Not Allowed errors
        try:
            logger.info('LoginView POST received: path=%s content_type=%s headers=%s', request.path, request.content_type, dict(request.headers))
        except Exception:
            pass

        # Log a safe preview of the raw request body for debugging JSON parse errors.
        try:
            raw = request.body or b''
            preview = raw[:200].decode('utf-8', errors='backslashreplace')
            logger.info('LoginView raw body length=%s bytes preview=%s', len(raw), preview)
        except Exception:
            try:
                logger.info('LoginView raw body repr=%r', request.body)
            except Exception:
                pass

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data.get('email')
        password = serializer.validated_data.get('password', '')

        # Password login
        if password:
            user = authenticate(request, username=email, password=password)
            if not user:
                return Response({'success': False, 'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            refresh = RefreshToken.for_user(user)
            return Response({'success': True, 'access': str(refresh.access_token), 'refresh': str(refresh)})

        # OTP login: generate and send OTP
        try:
            user = CustomUser.objects.get(email__iexact=email)
        except CustomUser.DoesNotExist:
            return Response({'success': False, 'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        code = generate_otp_code()
        expires_at = otp_expiry_time(minutes=10)
        otp = OTP.objects.create(user=user, code=code, expires_at=expires_at)

        # send via email (console backend configured)
        send_mail(
            subject='Your OTP Code',
            message=f'Your OTP code is: {code}',
            from_email=None,
            recipient_list=[user.email],
        )

        return Response({'success': True, 'message': 'OTP sent to email'})


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            otp = serializer.validated_data['otp']
            # mark used
            otp.mark_used()
            refresh = RefreshToken.for_user(user)
            return Response({'success': True, 'access': str(refresh.access_token), 'refresh': str(refresh)})
        except ValidationError as exc:
            return Response({'success': False, 'errors': exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'success': False, 'message': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request):
        # Allow fetching another user's profile by query param `id`
        uid = request.query_params.get('id') or request.query_params.get('user_id')
        if uid:
            try:
                user = CustomUser.objects.get(pk=int(uid))
            except (CustomUser.DoesNotExist, ValueError):
                return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            serializer = ProfileSerializer(user, context={'request': request})
            out = serializer.data
            # include counts for frontend (friends/connections/posts)
            try:
                out['friends_count'] = user.friends.count()
            except Exception:
                out['friends_count'] = 0
            try:
                out['connections_count'] = user.friends.count()
            except Exception:
                out['connections_count'] = out.get('friends_count', 0)
            try:
                out['posts_count'] = Post.objects.filter(author=user).count()
            except Exception:
                out['posts_count'] = 0
            try:
                # include a small preview of friends (first 3)
                friends_qs = user.friends.all()[:3]
                out['friends_preview'] = FriendSerializer(friends_qs, many=True, context={'request': request}).data
            except Exception:
                out['friends_preview'] = []
            return Response(out)

        serializer = ProfileSerializer(request.user, context={'request': request})
        out = serializer.data
        try:
            out['friends_count'] = request.user.friends.count()
        except Exception:
            out['friends_count'] = 0
        try:
            out['connections_count'] = request.user.friends.count()
        except Exception:
            out['connections_count'] = out.get('friends_count', 0)
        try:
            out['posts_count'] = Post.objects.filter(author=request.user).count()
        except Exception:
            out['posts_count'] = 0
        try:
            friends_qs = request.user.friends.all()[:3]
            out['friends_preview'] = FriendSerializer(friends_qs, many=True, context={'request': request}).data
        except Exception:
            out['friends_preview'] = []
        return Response(out)

    def put(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            out = ProfileSerializer(request.user, context={'request': request})
            return Response(out.data)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AvatarUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request):
        # allow POST for clients that prefer POST for uploads
        return self._handle(request)

    def put(self, request):
        return self._handle(request)

    def _handle(self, request):
        user = request.user
        file = request.FILES.get('avatar')
        if not file:
            return Response({'success': False, 'message': 'No avatar file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        # Log upload for debugging: confirm file received by server
        try:
            logger.info('Avatar upload received for user %s: filename=%s size=%s', getattr(user, 'id', None), getattr(file, 'name', None), getattr(file, 'size', None))
        except Exception:
            pass
        user.avatar = file
        user.save()
        serializer = ProfileSerializer(user, context={'request': request})
        return Response({'success': True, 'profile': serializer.data})


class DevLatestOTPView(APIView):
    """Dev-only: return latest OTP for a given email. Only enabled when DEBUG=True.

    This is intended to speed up development and should NOT be enabled in production.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not settings.DEBUG:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        email = request.query_params.get('email')
        if not email:
            return Response({'detail': 'email query param required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = CustomUser.objects.get(email__iexact=email)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        otp = OTP.objects.filter(user=user).order_by('-created_at').first()
        if not otp:
            return Response({'code': None})
        return Response({'code': otp.code, 'created_at': otp.created_at})
