# =============================================================================
# NutriPulse — Configuration
# =============================================================================
# Loads environment variables and validates critical settings.
# Usage: from config import Config
# =============================================================================

import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env from project root (one level up from backend/)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


class Config:
    """Flask application configuration."""

    # ── Security ─────────────────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY environment variable is not set. "
            'Generate one with: python -c "import secrets; print(secrets.token_hex(32))"'
        )

    # ── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # ── Database ─────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "nutripulse.db"
        ),
    )
    # Render PostgreSQL uses postgres:// but SQLAlchemy needs postgresql://
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace(
            "postgres://", "postgresql://", 1
        )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── Session (kept for web compatibility) ─────────────────────────────
    IS_PROD = os.getenv("FLASK_ENV", "development") == "production"
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = IS_PROD
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = 86400 * 30  # 30 days

    # ── External API Keys ────────────────────────────────────────────────
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    USDA_API_KEY = os.getenv("USDA_API_KEY")
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

    # ── Rate Limiting ────────────────────────────────────────────────────
    RATELIMIT_DEFAULT = "500 per day;100 per hour"
    RATELIMIT_STORAGE_URI = "memory://"
