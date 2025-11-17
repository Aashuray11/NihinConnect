from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import permissions
from django.shortcuts import get_object_or_404
from django.db import models
from django.db.models import Count
from django.utils import timezone
from .models import CustomUser, Message, Notification
from .serializers import MessageSerializer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class MessagesListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        other_id = request.query_params.get('user_id')
        if not other_id:
            return Response({'success': False, 'message': 'Provide user_id'}, status=status.HTTP_400_BAD_REQUEST)
        other = get_object_or_404(CustomUser, pk=other_id)
        msgs = Message.objects.filter(
            (models.Q(sender=request.user) & models.Q(receiver=other)) |
            (models.Q(sender=other) & models.Q(receiver=request.user))
        ).order_by('created_at')
        ser = MessageSerializer(msgs, many=True, context={'request': request})
        return Response({'success': True, 'messages': ser.data})


class SendMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        text = request.data.get('text')
        if not receiver_id or text is None:
            return Response({'success': False, 'message': 'receiver_id and text required'}, status=status.HTTP_400_BAD_REQUEST)
        receiver = get_object_or_404(CustomUser, pk=receiver_id)
        # ensure they are friends
        try:
            friends_qs = request.user.friends.all()
        except Exception:
            return Response({'success': False, 'message': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        if receiver not in friends_qs:
            return Response({'success': False, 'message': 'Can only message friends'}, status=status.HTTP_403_FORBIDDEN)
        try:
            m = Message.objects.create(sender=request.user, receiver=receiver, text=text)
            # create notification for receiver (generic relation)
            Notification.objects.create(recipient=receiver, actor=request.user, verb='sent you a message', content_object=m)
        except Exception as exc:
            return Response({'success': False, 'message': f'Failed to create message: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        ser = MessageSerializer(m, context={'request': request})
        # push real-time event to receiver and conversation group
        try:
            layer = get_channel_layer()
            payload = {
                'type': 'chat.message',
                'message': ser.data,
            }
            # per-user group
            async_to_sync(layer.group_send)(f'user_{receiver.id}', payload)
            # conversation group
            a, b = sorted([request.user.id, receiver.id])
            async_to_sync(layer.group_send)(f'conv_{a}_{b}', payload)
        except Exception:
            pass
        return Response({'success': True, 'message': ser.data}, status=status.HTTP_201_CREATED)


class EditMessageView(APIView):
    def post(self, request, pk):
        m = get_object_or_404(Message, pk=pk)
        if m.sender != request.user:
            return Response({'success': False, 'message': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        text = request.data.get('text')
        if text is None:
            return Response({'success': False, 'message': 'Text required'}, status=status.HTTP_400_BAD_REQUEST)
        m.text = text
        m.edited = True
        m.edited_at = timezone.now()
        m.save()
        ser = MessageSerializer(m, context={'request': request})
        return Response({'success': True, 'message': ser.data})


class UnreadMessagesCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        try:
            count = Message.objects.filter(receiver=request.user, is_read=False).count()
            return Response({'success': True, 'unread_count': count})
        except Exception:
            return Response({'success': False, 'unread_count': 0}, status=status.HTTP_200_OK)


class UnreadBySenderView(APIView):
    """Return unread message counts grouped by sender for the authenticated user.

    Response: { success: True, counts: [{ sender_id: 3, unread: 2 }, ...] }
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Message.objects.filter(receiver=request.user, is_read=False)
        data = qs.values('sender').annotate(unread=Count('id'))
        # normalize to list of dicts with sender_id
        out = [{'sender_id': item['sender'], 'unread': item['unread']} for item in data]
        return Response({'success': True, 'counts': out})


class ConversationsSummaryView(APIView):
    """Return conversation summaries for the authenticated user's friends.

    For each friend return: friend info, last_text, last_time, last_sender_id, unread count.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            friends_qs = request.user.friends.all()
            out = []
            for f in friends_qs:
                # last message between user and friend
                msgs = Message.objects.filter(
                    (models.Q(sender=request.user) & models.Q(receiver=f)) |
                    (models.Q(sender=f) & models.Q(receiver=request.user))
                ).order_by('-created_at')
                last = msgs.first()
                unread = Message.objects.filter(sender=f, receiver=request.user, is_read=False).count()
                out.append({
                    'friend': {
                        'id': f.id,
                        'name': getattr(f, 'name', '') or getattr(f, 'username', ''),
                        'avatar': (request.build_absolute_uri(f.avatar.url) if getattr(f, 'avatar', None) and getattr(f, 'avatar', None).name else None),
                        'email': getattr(f, 'email', '')
                    },
                    'last_text': last.text if last else None,
                    'last_time': last.created_at.isoformat() if last else None,
                    'last_sender_id': last.sender.id if last else None,
                    'unread': unread
                })

            # sort by last_time desc (None at the end)
            out.sort(key=lambda x: x['last_time'] or '', reverse=True)
            return Response({'success': True, 'conversations': out})
        except Exception as exc:
            # log and return error information for debugging (dev only)
            import traceback, sys
            tb = traceback.format_exc()
            print('ConversationsSummaryView exception:\n', tb)
            return Response({'success': False, 'error': str(exc), 'trace': tb}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MarkMessagesReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        other_id = request.data.get('user_id')
        if not other_id:
            return Response({'success': False, 'message': 'Provide user_id'}, status=status.HTTP_400_BAD_REQUEST)
        other = get_object_or_404(CustomUser, pk=other_id)
        Message.objects.filter(sender=other, receiver=request.user, is_read=False).update(is_read=True)
        return Response({'success': True})
