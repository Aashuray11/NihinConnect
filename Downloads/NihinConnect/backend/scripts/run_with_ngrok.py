#!/usr/bin/env python3
"""
Run the Django development server and create an ngrok tunnel to expose the backend API.

Usage:
  - Install pyngrok in the backend venv: `pip install pyngrok`
  - From `backend` folder run: `python scripts/run_with_ngrok.py`

This script starts `manage.py runserver 0.0.0.0:8000`, opens an ngrok tunnel to port
8000, prints the public URL and attempts to open it in the default browser.
"""
import os
import sys
import subprocess
import time
import webbrowser

try:
    from pyngrok import ngrok
except Exception:
    print("pyngrok is not installed. Install it into your venv: pip install pyngrok")
    sys.exit(1)


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MANAGE_PY = os.path.join(BASE_DIR, 'manage.py')

if not os.path.exists(MANAGE_PY):
    print('manage.py not found at', MANAGE_PY)
    sys.exit(1)


def start_django():
    print('Starting Django development server on 0.0.0.0:8000...')
    # Use the same python executable running this script (expected to be venv python)
    proc = subprocess.Popen([sys.executable, MANAGE_PY, 'runserver', '0.0.0.0:8000'], cwd=BASE_DIR)
    return proc


def start_ngrok():
    print('Starting ngrok tunnel to port 8000...')
    tunnel = ngrok.connect(8000, bind_tls=True)
    print('ngrok tunnel established:')
    print('  ', tunnel.public_url)
    try:
        webbrowser.open(tunnel.public_url)
    except Exception:
        pass
    return tunnel


def main():
    proc = start_django()

    # Give Django a moment to start
    time.sleep(2)

    tunnel = None
    try:
        tunnel = start_ngrok()
        print('\nBackend is available at:', tunnel.public_url)
        print('Note: this exposes only the backend (port 8000).')
        print('Press Ctrl+C to stop both the server and the tunnel.')

        proc.wait()
    except KeyboardInterrupt:
        print('\nShutting down...')
    finally:
        if tunnel:
            try:
                ngrok.disconnect(tunnel.public_url)
            except Exception:
                pass
            try:
                ngrok.kill()
            except Exception:
                pass
        try:
            proc.terminate()
        except Exception:
            pass


if __name__ == '__main__':
    main()
