from rest_framework import serializers
from .models import Post, Comment
from users.models import Notification


class PostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True)
    author_avatar = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    liked_by_user = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'author', 'author_name', 'author_avatar', 'text', 'image', 'created_at', 'time', 'likes_count', 'liked_by_user', 'comments_count']
        read_only_fields = ['author', 'author_name', 'author_avatar', 'created_at', 'time']

    def get_author_avatar(self, obj):
        try:
            if obj.author.avatar:
                request = self.context.get('request')
                url = obj.author.avatar.url
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None

    def get_time(self, obj):
        return obj.created_at.strftime('%b %d, %Y %H:%M')

    def get_likes_count(self, obj):
        try:
            return obj.likes.count()
        except Exception:
            # If the likes table doesn't exist yet (migration not applied), return 0 instead of raising
            return 0

    def get_comments_count(self, obj):
        try:
            return obj.comments.count()
        except Exception:
            # If the comments table doesn't exist yet (migration not applied), return 0 instead of raising
            return 0

    def get_liked_by_user(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()


class LikeUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        try:
            if obj.avatar:
                request = self.context.get('request')
                url = obj.avatar.url
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None


class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'user', 'user_name', 'user_avatar', 'text', 'created_at']
        read_only_fields = ['user', 'user_name', 'user_avatar', 'created_at']

    def get_user_avatar(self, obj):
        try:
            if obj.user.avatar:
                request = self.context.get('request')
                url = obj.user.avatar.url
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None
