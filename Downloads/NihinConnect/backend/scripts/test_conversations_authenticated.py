import os
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(BASE))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

import django
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from users.views_messages import ConversationsSummaryView
from users.models import CustomUser

def run(uid=1):
    factory = APIRequestFactory()
    req = factory.get('/auth/messages/conversations/')
    user = CustomUser.objects.get(pk=uid)
    force_authenticate(req, user=user)
    view = ConversationsSummaryView.as_view()
    resp = view(req)
    print('status', resp.status_code)
    print(resp.data)

if __name__ == '__main__':
    import sys
    uid = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    run(uid)
