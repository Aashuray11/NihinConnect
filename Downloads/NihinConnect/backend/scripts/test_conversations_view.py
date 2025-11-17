import os
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

import django
django.setup()

from django.test import RequestFactory
from users.models import CustomUser
from users.views_messages import ConversationsSummaryView

def run(uid):
    rf = RequestFactory()
    req = rf.get('/auth/messages/conversations/')
    # attach a user
    user = CustomUser.objects.get(pk=uid)
    req.user = user
    view = ConversationsSummaryView.as_view()
    resp = view(req)
    print('Status:', resp.status_code)
    print('Data:', resp.data)

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Usage: test_conversations_view.py <user_id>')
        sys.exit(1)
    run(int(sys.argv[1]))
