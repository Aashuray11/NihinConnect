from rest_framework import generics, permissions
from rest_framework.response import Response
from django.db import models
from .models import Post
from .serializers import PostSerializer
from .serializers import LikeUserSerializer, CommentSerializer
from .models import Comment
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .serializers import LikeUserSerializer
from users.models import CustomUser, Notification
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView


class FeedView(generics.ListAPIView):
    serializer_class = PostSerializer
    # Require authentication to view the feed in development (ngrok will now require login)
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Post.objects.select_related('author').all()
        q = self.request.GET.get('q') or self.request.GET.get('search')
        if q:
            # simple search: match post text or author name
            return qs.filter(models.Q(text__icontains=q) | models.Q(author__name__icontains=q))
        return qs

    def list(self, request, *args, **kwargs):
        """Return posts separated into friends' posts and other posts."""
        user = request.user if request.user and request.user.is_authenticated else None
        qs = Post.objects.select_related('author').all()
        # apply optional q filter
        q = request.GET.get('q') or request.GET.get('search')
        if q:
            qs = qs.filter(models.Q(text__icontains=q) | models.Q(author__name__icontains=q))

        if user:
            # friends is a M2M on user
            friends_qs = qs.filter(author__in=user.friends.all())
            others_qs = qs.exclude(author__in=user.friends.all()).exclude(author=user)
            # include user's own posts at top of friends list
            own_qs = qs.filter(author=user)
            friends_combined = (own_qs | friends_qs).distinct().order_by('-created_at')
            serializer_f = self.get_serializer(friends_combined, many=True)
            serializer_o = self.get_serializer(others_qs.order_by('-created_at'), many=True)
            return Response({'friends': serializer_f.data, 'others': serializer_o.data})

        # anonymous: return all posts as others
        serializer = self.get_serializer(qs.order_by('-created_at'), many=True)
        return Response({'friends': [], 'others': serializer.data})


class CreatePostView(generics.CreateAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class LikeToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        user = request.user
        like_qs = post.likes.filter(user=user)
        if like_qs.exists():
            like_qs.delete()
            return Response({'liked': False, 'likes_count': post.likes.count()}, status=status.HTTP_200_OK)
        else:
            post.likes.create(user=user)
            # create notification for post author
            try:
                if post.author and post.author != user:
                    Notification.objects.create(recipient=post.author, actor=user, verb='liked your post', content_object=post)
            except Exception:
                pass
            return Response({'liked': True, 'likes_count': post.likes.count()}, status=status.HTTP_201_CREATED)


class LikesListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        users = CustomUser.objects.filter(likes__post=post).distinct()
        serializer = LikeUserSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)


class CommentsListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        comments = post.comments.select_related('user').all()
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)


class PostDetailView(APIView):
    """Retrieve or delete a single post. Deletion allowed only for the post author."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        ser = PostSerializer(post, context={'request': request})
        return Response(ser.data)

    def delete(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        if not request.user or not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        if post.author != request.user:
            return Response({'detail': 'Not authorized to delete this post.'}, status=status.HTTP_403_FORBIDDEN)
        post.delete()
        return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)

    def post(self, request, pk):
        # create a comment (authenticated)
        if not request.user or not request.user.is_authenticated:
            return Response({'detail': 'Authentication credentials were not provided.'}, status=status.HTTP_401_UNAUTHORIZED)
        post = get_object_or_404(Post, pk=pk)
        serializer = CommentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            comment = serializer.save(user=request.user, post=post)
            # create notification for post author
            try:
                if post.author and post.author != request.user:
                    Notification.objects.create(recipient=post.author, actor=request.user, verb='commented on your post', content_object=comment)
            except Exception:
                pass
            out = CommentSerializer(comment, context={'request': request})
            return Response(out.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
