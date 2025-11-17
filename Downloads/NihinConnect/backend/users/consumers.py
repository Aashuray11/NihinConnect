import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
import collections

User = get_user_model()

class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # authenticate via ?token=<access_token>
        qs = parse_qs(self.scope.get('query_string', b'').decode())
        token = qs.get('token', [None])[0]
        self.user = None
        if token:
            try:
                access = AccessToken(token)
                user_id = access.get('user_id')
                if user_id:
                    self.user = await database_sync_to_async(User.objects.get)(pk=user_id)
            except Exception:
                self.user = None
        if not self.user or not self.user.is_active:
            await self.close()
            return
        self.user_group_name = f'user_{self.user.id}'
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)
        await self.accept()
        try:
            print(f"ChatConsumer: accepted WS for user {self.user.id}, channel={self.channel_name}")
        except Exception:
            pass
        # track joined conversation groups and recently-seen message ids to avoid duplicates
        self.scope.setdefault('joined_convs', set())
        self.scope.setdefault('seen_message_ids', collections.deque(maxlen=100))

    async def disconnect(self, code):
        try:
            if hasattr(self, 'user_group_name'):
                await self.channel_layer.group_discard(self.user_group_name, self.channel_name)
        except Exception:
            pass

    async def receive_json(self, content, **kwargs):
        # supported actions: join (friend_id), leave (friend_id)
        action = content.get('action')
        try:
            print(f"ChatConsumer: receive_json action={action} from user={getattr(self.user,'id',None)} content={content}")
        except Exception:
            pass
        if action == 'join':
            friend_id = content.get('friend_id')
            if not friend_id:
                return
            a = min(self.user.id, int(friend_id))
            b = max(self.user.id, int(friend_id))
            group = f'conv_{a}_{b}'
            await self.channel_layer.group_add(group, self.channel_name)
            # remember joined convs for cleanup
            self.scope.setdefault('joined_convs', set()).add(group)
            try:
                print(f"ChatConsumer: user {self.user.id} joined group {group}")
            except Exception:
                pass
        elif action == 'leave':
            friend_id = content.get('friend_id')
            if not friend_id:
                return
            a = min(self.user.id, int(friend_id))
            b = max(self.user.id, int(friend_id))
            group = f'conv_{a}_{b}'
            await self.channel_layer.group_discard(group, self.channel_name)
            if 'joined_convs' in self.scope and group in self.scope['joined_convs']:
                self.scope['joined_convs'].remove(group)
            try:
                print(f"ChatConsumer: user {getattr(self.user,'id',None)} left group {group}")
            except Exception:
                pass
        # optionally support sending over WS (not required)
        elif action == 'send':
            # sender must be authenticated user
            receiver_id = content.get('receiver_id')
            text = content.get('text')
            if not receiver_id or text is None:
                return
            # broadcast to receiver and conv group; backend API still stores message
            a = min(self.user.id, int(receiver_id))
            b = max(self.user.id, int(receiver_id))
            conv_group = f'conv_{a}_{b}'
            payload = {
                'type': 'chat.message',
                'message': {
                    'id': content.get('tmp_id') or None,
                    'text': text,
                    'sender': {'id': self.user.id, 'name': self.user.name, 'avatar': getattr(self.user, 'avatar', None)},
                }
            }
            await self.channel_layer.group_send(conv_group, payload)
            try:
                print(f"ChatConsumer: user {self.user.id} sent message to conv {conv_group}")
            except Exception:
                pass
        elif action == 'typing':
            # broadcast typing status to conversation and user group
            friend_id = content.get('friend_id')
            typing = bool(content.get('typing'))
            if not friend_id:
                return
            a = min(self.user.id, int(friend_id))
            b = max(self.user.id, int(friend_id))
            conv_group = f'conv_{a}_{b}'
            payload = {
                'type': 'chat.typing',
                'typing': {
                    'user_id': self.user.id,
                    'friend_id': int(friend_id),
                    'typing': typing,
                }
            }
            await self.channel_layer.group_send(conv_group, payload)
            try:
                print(f"ChatConsumer: user {self.user.id} typing={typing} in conv {conv_group}")
            except Exception:
                pass

    async def chat_message(self, event):
        # forwarded from server-side when a message is created
        message = event.get('message')
        try:
            msg_id = message.get('id')
        except Exception:
            msg_id = None
        # dedupe: if this connection already forwarded this message id, skip
        try:
            seen = self.scope.setdefault('seen_message_ids', collections.deque(maxlen=100))
            if msg_id is not None and msg_id in seen:
                return
            if msg_id is not None:
                seen.append(msg_id)
        except Exception:
            pass
        try:
            print(f"ChatConsumer: forwarding message to client user={getattr(self.user,'id',None)} message_id={message.get('id')}")
        except Exception:
            pass
        await self.send_json({'type': 'new_message', 'message': message})

    async def chat_typing(self, event):
        # forwarded typing event from server-side or peer
        typing = event.get('typing')
        try:
            await self.send_json({'type': 'typing', 'typing': typing})
        except Exception:
            pass

    # also accept generic new.message type
    async def new_message(self, event):
        message = event.get('message')
        try:
            msg_id = message.get('id')
        except Exception:
            msg_id = None
        try:
            seen = self.scope.setdefault('seen_message_ids', collections.deque(maxlen=100))
            if msg_id is not None and msg_id in seen:
                return
            if msg_id is not None:
                seen.append(msg_id)
        except Exception:
            pass
        await self.send_json({'type': 'new_message', 'message': message})
