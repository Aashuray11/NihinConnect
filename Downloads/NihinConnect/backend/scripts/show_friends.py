import os
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

import django
django.setup()

from users.models import CustomUser

print('Users and their friend IDs:')
for u in CustomUser.objects.all():
    name = getattr(u, 'name', None) or getattr(u, 'username', None) or str(u.id)
    friends = list(u.friends.values_list('id', flat=True))
    print(f'- {u.id}: {name} -> friends: {friends}')
