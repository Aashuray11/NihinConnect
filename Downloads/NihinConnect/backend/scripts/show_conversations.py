import os
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(BASE))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

import django
django.setup()

from users.models import CustomUser, Message
from django.db import models

uid = int(sys.argv[1]) if len(sys.argv) > 1 else None
if not uid:
    print('Usage: show_conversations.py <user_id>')
    sys.exit(1)

user = CustomUser.objects.get(pk=uid)
print(f'Conversations for user {user.id} ({getattr(user, "name", None) or getattr(user, "username", None)}):')
for f in user.friends.all():
    msgs = Message.objects.filter((models.Q(sender=user) & models.Q(receiver=f)) | (models.Q(sender=f) & models.Q(receiver=user))).order_by('-created_at')
    last = msgs.first()
    unread = Message.objects.filter(sender=f, receiver=user, is_read=False).count()
    print(f'- Friend {f.id}: name={getattr(f, "name", None) or getattr(f, "username", None)}, last_text={last.text if last else None}, last_sender={last.sender.id if last else None}, unread={unread}')
