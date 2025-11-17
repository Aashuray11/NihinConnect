from django.urls import path
from .views import FeedView, CreatePostView, LikeToggleView, LikesListView, CommentsListCreateView
from .views import PostDetailView

urlpatterns = [
    path('feed/', FeedView.as_view(), name='posts-feed'),
    path('', CreatePostView.as_view(), name='posts-create'),
    path('<int:pk>/like/', LikeToggleView.as_view(), name='post-like'),
    path('<int:pk>/likes/', LikesListView.as_view(), name='post-likes'),
    path('<int:pk>/comments/', CommentsListCreateView.as_view(), name='post-comments'),
    path('<int:pk>/', PostDetailView.as_view(), name='post-detail'),
]
