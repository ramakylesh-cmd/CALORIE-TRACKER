# =============================================================================
# NutriPulse — Flask Application Factory
# =============================================================================
# Creates and configures the Flask application with all extensions and routes.
# Usage:
#   from backend.app import create_app
#   app = create_app()
#
# This replaces the old monolithic app.py while keeping full backward
# compatibility with the existing web frontend (templates, static files).
# =============================================================================

import os
import logging
from flask import Flask, render_template, session

from backend.config import Config
from backend.extensions import db, jwt, limiter, cors

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def create_app(config_class=Config):
    """Flask application factory."""

    # Resolve paths relative to project root (one level up from backend/)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_dir = os.path.join(project_root, "templates")
    static_dir = os.path.join(project_root, "static")

    app = Flask(
        __name__,
        template_folder=template_dir,
        static_folder=static_dir,
        static_url_path="/static",
    )
    app.config.from_object(config_class)

    # ── Initialize Extensions ────────────────────────────────────────────
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    cors.init_app(app, resources={
        r"/auth/*": {"origins": "*"},
        r"/add_food": {"origins": "*"},
        r"/add_ai_entry": {"origins": "*"},
        r"/delete_entry": {"origins": "*"},
        r"/clear_log": {"origins": "*"},
        r"/get_totals": {"origins": "*"},
        r"/analyze_photo": {"origins": "*"},
        r"/update_profile": {"origins": "*"},
        r"/add_water": {"origins": "*"},
        r"/reset_water": {"origins": "*"},
        r"/search_foods": {"origins": "*"},
        r"/scan_barcode": {"origins": "*"},
        r"/parse_input": {"origins": "*"},
        r"/search_usda": {"origins": "*"},
        r"/health": {"origins": "*"},
    }, supports_credentials=True)

    # ── Register Blueprints ──────────────────────────────────────────────
    from backend.routes.auth import auth_bp
    from backend.routes.food import food_bp
    from backend.routes.photo import photo_bp
    from backend.routes.water import water_bp
    from backend.routes.search import search_bp
    from backend.routes.profile import profile_bp

    app.register_blueprint(auth_bp)      # /auth/google, /auth/me, etc.
    app.register_blueprint(food_bp)      # /add_food, /delete_entry, etc.
    app.register_blueprint(photo_bp)     # /analyze_photo
    app.register_blueprint(water_bp)     # /add_water, /reset_water
    app.register_blueprint(search_bp)    # /search_foods, /scan_barcode, etc.
    app.register_blueprint(profile_bp)   # /update_profile

    # ── Web Frontend Route (backward compatible) ─────────────────────────
    @app.route("/")
    def index():
        session.permanent = True
        user = session.get("user", None)
        google_client_id = app.config.get("GOOGLE_CLIENT_ID") or ""
        return render_template("index.html", google_client_id=google_client_id, user=user)

    @app.route("/health")
    def health():
        if app.config.get("IS_PROD"):
            return {"status": "ok"}, 200
        return {
            "status": "ok",
            "groq_key_set": bool(app.config.get("GROQ_API_KEY")),
            "usda_key_set": bool(app.config.get("USDA_API_KEY")),
            "database": str(app.config.get("SQLALCHEMY_DATABASE_URI", ""))[:30] + "...",
            "pipeline": "groq_vision → groq_text → localdb/usda fallback",
        }

    # ── Create Database Tables ───────────────────────────────────────────
    with app.app_context():
        # Import models so SQLAlchemy knows about them
        from backend.models import User, FoodLog, WaterLog, UserProfile  # noqa: F401
        db.create_all()
        logger.info("Database tables initialized")

    logger.info("NutriPulse backend initialized successfully")
    return app
