from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404

from .models import CustomUser, FriendRequest, Notification
from .serializers import FriendRequestSerializer, FriendSerializer, NotificationSerializer


class SendFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        receiver_email = request.data.get('email')
        receiver_id = request.data.get('receiver_id')

        if not receiver_email and not receiver_id:
            return Response({'success': False, 'message': 'Provide receiver email or receiver_id'}, status=status.HTTP_400_BAD_REQUEST)

        receiver = None
        if receiver_id:
            try:
                receiver = CustomUser.objects.get(pk=int(receiver_id))
            except (CustomUser.DoesNotExist, ValueError):
                return Response({'success': False, 'message': 'Receiver with that id not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                receiver = CustomUser.objects.get(email__iexact=receiver_email)
            except CustomUser.DoesNotExist:
                return Response({'success': False, 'message': 'Receiver not found by email'}, status=status.HTTP_404_NOT_FOUND)

        sender = request.user
        if receiver == sender:
            return Response({'success': False, 'message': "You can't send a friend request to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # Already friends?
        if receiver in sender.friends.all():
            return Response({'success': False, 'message': 'You are already friends.'}, status=status.HTTP_400_BAD_REQUEST)

        # Existing pending request
        existing = FriendRequest.objects.filter(sender=sender, receiver=receiver).first()
        if existing and existing.status == FriendRequest.STATUS_PENDING:
            return Response({'success': False, 'message': 'Friend request already sent.'}, status=status.HTTP_400_BAD_REQUEST)

        fr, created = FriendRequest.objects.get_or_create(sender=sender, receiver=receiver)
        if not created:
            fr.status = FriendRequest.STATUS_PENDING
            fr.save(update_fields=['status'])

        # create notification for receiver
        try:
            Notification.objects.create(recipient=receiver, actor=sender, verb='sent you a friend request', content_object=fr)
        except Exception:
            pass

        return Response({'success': True, 'message': 'Friend request sent.', 'request_id': fr.id}, status=status.HTTP_201_CREATED)


class RespondFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        action = request.data.get('action')
        if action not in ('accept', 'reject'):
            return Response({'success': False, 'message': 'Action must be "accept" or "reject".'}, status=status.HTTP_400_BAD_REQUEST)

        fr = get_object_or_404(FriendRequest, pk=pk)
        if fr.receiver != request.user:
            return Response({'success': False, 'message': 'Not authorized to respond to this request.'}, status=status.HTTP_403_FORBIDDEN)

        if action == 'accept':
            fr.accept()
            try:
                Notification.objects.create(recipient=fr.sender, actor=request.user, verb='accepted your friend request', content_object=fr)
            except Exception:
                pass
            return Response({'success': True, 'message': 'Friend request accepted.'})
        else:
            fr.reject()
            try:
                Notification.objects.create(recipient=fr.sender, actor=request.user, verb='rejected your friend request', content_object=fr)
            except Exception:
                pass
            return Response({'success': True, 'message': 'Friend request rejected.'})


class ListFriendRequestsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        incoming = FriendRequest.objects.filter(receiver=request.user, status=FriendRequest.STATUS_PENDING).order_by('-created_at')
        serializer = FriendRequestSerializer(incoming, many=True, context={'request': request})
        return Response({'success': True, 'requests': serializer.data})


class ListFriendsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        friends = request.user.friends.all()
        serializer = FriendSerializer(friends, many=True, context={'request': request})
        return Response({'success': True, 'friends': serializer.data})


class ListAllUsersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        users = CustomUser.objects.exclude(pk=request.user.pk).order_by('name')
        out = []
        for u in users:
            ser = FriendSerializer(u, context={'request': request}).data
            is_friend = u in request.user.friends.all()
            # pending requests
            sent = FriendRequest.objects.filter(sender=request.user, receiver=u, status=FriendRequest.STATUS_PENDING).first()
            received = FriendRequest.objects.filter(sender=u, receiver=request.user, status=FriendRequest.STATUS_PENDING).first()
            ser.update({
                'is_friend': is_friend,
                'request_sent': bool(sent),
                'request_sent_id': sent.id if sent else None,
                'request_received': bool(received),
                'request_received_id': received.id if received else None,
            })
            out.append(ser)
        return Response({'success': True, 'users': out})


class CancelFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        fr = get_object_or_404(FriendRequest, pk=pk)
        if fr.sender != request.user:
            return Response({'success': False, 'message': 'Not authorized to cancel this request.'}, status=status.HTTP_403_FORBIDDEN)
        if fr.status != FriendRequest.STATUS_PENDING:
            return Response({'success': False, 'message': 'Cannot cancel a non-pending request.'}, status=status.HTTP_400_BAD_REQUEST)
        fr.delete()
        return Response({'success': True, 'message': 'Friend request cancelled.'})


class NotificationsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(recipient=request.user).order_by('-created_at')[:50]
        ser = NotificationSerializer(notifs, many=True, context={'request': request})
        unread_count = Notification.objects.filter(recipient=request.user, unread=True).count()
        return Response({'success': True, 'notifications': ser.data, 'unread_count': unread_count})


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
        notif.unread = False
        notif.save(update_fields=['unread'])
        return Response({'success': True})


class NotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, unread=True).update(unread=False)
        return Response({'success': True})
