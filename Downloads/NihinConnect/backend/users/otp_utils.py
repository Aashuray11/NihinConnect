import random
from django.utils import timezone


def generate_otp_code(n=6):
    return ''.join(str(random.randint(0, 9)) for _ in range(n))

def otp_expiry_time(minutes=10):
    return timezone.now() + timezone.timedelta(minutes=minutes)
