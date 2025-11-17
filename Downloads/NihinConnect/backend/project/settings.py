from pathlib import Path
import datetime

# Minimal settings for the backend project
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'change-me-in-production'

DEBUG = True

# In development allow all hosts so ngrok tunnels and local machines can connect.
# Do NOT use ['*'] in production — instead set specific hostnames.
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'users',
    'posts',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'project.middleware.SecurityHeadersMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # include project templates so Django can render a simple login page in dev
        'DIRS': [BASE_DIR / 'project' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ASGI_APPLICATION = 'project.asgi.application'
WSGI_APPLICATION = 'project.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'
# Directory where `collectstatic` will collect static files for serving.
# You can build your frontend (Vite) into a directory such as ../frontend/dist
# and then run `python manage.py collectstatic` to have Django serve it.
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ensure default charset is utf-8 for responses
DEFAULT_CHARSET = 'utf-8'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Use the custom user model
AUTH_USER_MODEL = 'users.CustomUser'

# Channels (in-memory for development). Use Redis in production.
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}

# REST framework + SimpleJWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

# Simple email backend for development (prints emails to console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Media files (for avatars)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# When the app is behind a proxy (ngrok / other), this tells Django to trust
# the `X-Forwarded-Proto` header so `request.is_secure()` and
# `request.build_absolute_uri()` can produce `https://` URLs when the public
# URL is HTTPS. This avoids mixed-content or inaccessible image URLs on
# mobile when using ngrok tunnels.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
# Permit using the forwarded `Host` header from proxies so absolute URIs use
# the public hostname when available.
USE_X_FORWARDED_HOST = True

# Optional: when running behind a tunnel (ngrok) you can set an external
# public URL here (or via the EXTERNAL_BASE_URL environment variable). This
# value is used as a fallback when serializers build absolute media URLs and
# `request` is not available (e.g. some internal scripts).
import os
EXTERNAL_BASE_URL = os.environ.get('EXTERNAL_BASE_URL', '')

# Prefer an explicit allowlist for development to avoid surprises with ngrok.
# You can add/remove entries here as you test.
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://nihin-connect.vercel.app",
    "http://192.168.31.43:5173",
    "https://ahmad-prosurgical-stuart.ngrok-free.dev",
]
# Allow cookies/credentials during dev if frontend sends them
CORS_ALLOW_CREDENTIALS = True
# Allow ngrok's browser warning skip header so API requests to ngrok don't return
# the HTML interstitial (ERR_NGROK_6024). This header is safe to allow in dev.
try:
    from corsheaders.defaults import default_headers
    # include common headers plus our special ngrok skip header and ensure
    # Authorization is allowed (case-insensitive handling is performed by
    # corsheaders normally, but we include common variants for completeness).
    CORS_ALLOW_HEADERS = list(default_headers) + [
        'ngrok-skip-browser-warning',
        'Authorization',
        'authorization',
    ]
except Exception:
    # If corsheaders isn't available or import fails, fall back to allowing
    # the most important header names only so development still works.
    CORS_ALLOW_HEADERS = [
        'ngrok-skip-browser-warning',
        'Authorization',
    ]

# Allow LAN/dev hosts used when you open the Vite dev server from a phone.
# This lets origins like http://192.168.31.43:5173 (your phone using laptop IP)
# be accepted by Django during development. The regex below is intentionally
# permissive for local 192.168.* addresses on port 5173 only.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://192\.168\.\d+\.\d+:5173$",
    r"^http://192\.168\.56\.1:5173$",
]

# CSRF trusted origins (required for Django when using secure cookies or
# when the frontend is served from a different origin). Add your Vercel and
# ngrok public URLs here so POST requests with CSRF/external cookies work.
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.31.43:5173',
    'http://192.168.56.1:5173',
    'https://nihin-connect.vercel.app',
    'https://ahmad-prosurgical-stuart.ngrok-free.dev',
]
    


