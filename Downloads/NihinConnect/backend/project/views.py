from django.views.generic import TemplateView


class LoginPageView(TemplateView):
    template_name = 'login.html'
from django.http import JsonResponse


def posts_feed(request):
    """Minimal posts feed for development.

    Returns an empty list of posts or a small sample to avoid 404s from the frontend.
    """
    # You can replace this with real queryset serialization later.
    sample_posts = []
    return JsonResponse({"posts": sample_posts})
