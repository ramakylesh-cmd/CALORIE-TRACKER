# =============================================================================
# NutriPulse — Flask Extension Instances
# =============================================================================
# Created here (without app) and bound to app via init_app() in the factory.
# This avoids circular imports when models/routes need to reference db, jwt, etc.
# =============================================================================

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS

db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["500 per day", "100 per hour"],
    storage_uri="memory://",
)
cors = CORS()
