from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView
from .views_auth import LoginView, VerifyOTPView
from .views_friend import SendFriendRequestView, RespondFriendRequestView, ListFriendRequestsView, ListFriendsView, ListAllUsersView, CancelFriendRequestView, NotificationsListView, NotificationMarkReadView, NotificationMarkAllReadView
from .views_auth import ProfileView
from .views_auth import AvatarUploadView
from .views_auth import DevLatestOTPView
from .views_messages import MessagesListView, SendMessageView, EditMessageView, UnreadMessagesCountView, MarkMessagesReadView, UnreadBySenderView, ConversationsSummaryView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/avatar/', AvatarUploadView.as_view(), name='profile-avatar'),
    path('dev/latest-otp/', DevLatestOTPView.as_view(), name='dev-latest-otp'),
    # SimpleJWT token refresh endpoint (frontend expects /auth/token/refresh/)
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Friend requests
    path('friend-requests/send/', SendFriendRequestView.as_view(), name='friend-request-send'),
    path('friend-requests/', ListFriendRequestsView.as_view(), name='friend-requests-list'),
    path('friend-requests/<int:pk>/respond/', RespondFriendRequestView.as_view(), name='friend-request-respond'),
    path('friend-requests/<int:pk>/cancel/', CancelFriendRequestView.as_view(), name='friend-request-cancel'),
    path('friends/', ListFriendsView.as_view(), name='friends-list'),
    path('users/all/', ListAllUsersView.as_view(), name='users-list-all'),
    path('notifications/', NotificationsListView.as_view(), name='notifications-list'),
    path('notifications/<int:pk>/mark-read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/mark-all-read/', NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    # Messaging endpoints
    path('messages/', MessagesListView.as_view(), name='messages-list'),
    path('messages/send/', SendMessageView.as_view(), name='messages-send'),
    path('messages/<int:pk>/edit/', EditMessageView.as_view(), name='messages-edit'),
    path('messages/unread-count/', UnreadMessagesCountView.as_view(), name='messages-unread-count'),
    path('messages/unread-by-sender/', UnreadBySenderView.as_view(), name='messages-unread-by-sender'),
    path('messages/conversations/', ConversationsSummaryView.as_view(), name='messages-conversations'),
    path('messages/mark-read/', MarkMessagesReadView.as_view(), name='messages-mark-read'),
]
