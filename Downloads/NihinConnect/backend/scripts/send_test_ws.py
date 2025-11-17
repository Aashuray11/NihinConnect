import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from users.models import CustomUser, Message
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

u1 = CustomUser.objects.first()
try:
    u2 = CustomUser.objects.exclude(pk=u1.pk).first()
except Exception:
    u2 = None
print('users', getattr(u1,'id',None), getattr(u2,'id',None))
if not u1 or not u2:
    print('need two users in DB to test')
    raise SystemExit(1)

m = Message.objects.create(sender=u1, receiver=u2, text='test real-time push')
ser = {
    'id': m.id,
    'text': m.text,
    'created_at': m.created_at.isoformat(),
    'sender': {'id': u1.id, 'name': getattr(u1, 'name', getattr(u1, 'username', None))},
    'receiver': {'id': u2.id}
}
layer = get_channel_layer()
async_to_sync(layer.group_send)(f'user_{u2.id}', {'type': 'chat.message', 'message': ser})
async_to_sync(layer.group_send)(f'conv_{min(u1.id,u2.id)}_{max(u1.id,u2.id)}', {'type': 'chat.message', 'message': ser})
print('ok_sent', ser)
