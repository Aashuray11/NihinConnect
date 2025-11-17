from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import CustomUser
from .models import FriendRequest


@admin.register(CustomUser)
class CustomUserAdmin(DjangoUserAdmin):
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('name', 'avatar')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'created_at')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'name', 'password1', 'password2')}),
    )
    list_display = ('email', 'name', 'is_staff', 'is_active')
    search_fields = ('email', 'name')
    ordering = ('email',)

    def friends_count(self, obj):
        return obj.friends.count()
    friends_count.short_description = 'Friends'


@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'status', 'created_at')
    search_fields = ('sender__email', 'receiver__email')
    list_filter = ('status',)
