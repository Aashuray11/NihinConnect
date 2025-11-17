from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
)
from django.utils import timezone
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class CustomUserManager(BaseUserManager):
    def create_user(self, email, name=None, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name or '', **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if password is None:
            raise ValueError('Superusers must have a password.')
        return self.create_user(email, name, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField('Email address', unique=True)
    name = models.CharField('Full name', max_length=150)
    password = models.CharField('Password', max_length=128, blank=True, null=True)
    avatar = models.ImageField('Avatar', upload_to='avatars/', blank=True, null=True)
    is_active = models.BooleanField('Active', default=True)
    is_staff = models.BooleanField('Staff', default=False)
    # Additional profile fields
    location = models.CharField('Location', max_length=200, blank=True, null=True)
    phone = models.CharField('Phone', max_length=50, blank=True, null=True)
    school = models.CharField('School', max_length=200, blank=True, null=True)
    bio = models.TextField('Bio', blank=True, null=True)
    slogan = models.CharField('Slogan', max_length=255, blank=True, null=True)
    created_at = models.DateTimeField('Created at', default=timezone.now)
    updated_at = models.DateTimeField('Updated at', auto_now=True)
    friends = models.ManyToManyField('self', symmetrical=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.name or self.email


class OTP(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'OTP'
        verbose_name_plural = 'OTPs'

    def is_expired(self):
        return timezone.now() > self.expires_at

    def mark_used(self):
        self.used = True
        self.save(update_fields=['used'])


class FriendRequest(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_friend_requests')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_friend_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Friend Request'
        verbose_name_plural = 'Friend Requests'
        unique_together = ('sender', 'receiver')

    def accept(self):
        if self.status != self.STATUS_PENDING:
            return
        self.status = self.STATUS_ACCEPTED
        # add each other as friends
        self.sender.friends.add(self.receiver)
        self.receiver.friends.add(self.sender)
        self.save(update_fields=['status'])

    def reject(self):
        if self.status != self.STATUS_PENDING:
            return
        self.status = self.STATUS_REJECTED
        self.save(update_fields=['status'])

    def __str__(self):
        return f"{self.sender} -> {self.receiver} ({self.status})"


class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='actor_notifications')
    verb = models.CharField(max_length=255)
    unread = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    # Generic relation to any object (Post, Comment, FriendRequest, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification to {self.recipient}: {self.actor} {self.verb}"


class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    text = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    edited_at = models.DateTimeField(null=True, blank=True)
    edited = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        ordering = ['created_at']

    def __str__(self):
        return f"Message {self.id} from {self.sender} to {self.receiver}"


