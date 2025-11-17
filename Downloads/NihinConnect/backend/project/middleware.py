from django.utils.deprecation import MiddlewareMixin


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add/normalize security-related headers on all responses.

    - Ensure X-Content-Type-Options: nosniff is present
    - Ensure responses have a sensible Cache-Control without 'must-revalidate' or 'no-store'
    """
    def process_response(self, request, response):
        # X-Content-Type-Options
        try:
            if 'X-Content-Type-Options' not in response:
                response['X-Content-Type-Options'] = 'nosniff'
        except Exception:
            pass

        # Normalize Cache-Control: remove problematic directives
        try:
            cc = response.get('Cache-Control', '')
            if cc:
                # remove must-revalidate and no-store
                parts = [p.strip() for p in cc.split(',') if p.strip() and p.strip().lower() not in ('must-revalidate', 'no-store')]
                new_cc = ', '.join(parts).strip()
                if not new_cc:
                    # default to a conservative no-cache directive
                    new_cc = 'no-cache, max-age=0'
                response['Cache-Control'] = new_cc
            else:
                # set a reasonable default for dynamic responses
                response['Cache-Control'] = 'no-cache, max-age=0'
        except Exception:
            pass

        # Ensure charset present (Django defaults to utf-8, but be explicit)
        try:
            ctype = response.get('Content-Type', '')
            if ctype and 'charset' not in ctype.lower():
                if ';' in ctype:
                    response['Content-Type'] = ctype + '; charset=utf-8'
                else:
                    response['Content-Type'] = ctype + '; charset=utf-8'
        except Exception:
            pass

        return response
