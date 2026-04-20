# =============================================================================
# NutriPulse — WSGI Entry Point (Production)
# =============================================================================
# Used by Gunicorn on Render: gunicorn wsgi:app
# =============================================================================

from backend.app import create_app

app = create_app()
