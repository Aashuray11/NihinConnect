from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from project.views import LoginPageView


urlpatterns = [
    # Development login page at root — opens a small UI that posts to /auth/login/
    path('', LoginPageView.as_view(), name='login_page'),
    path('admin/', admin.site.urls),
    path('auth/', include('users.urls')),
    path('posts/', include('posts.urls')),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

