# =============================================================================
# NutriPulse — Auth Routes
# =============================================================================
import logging
import requests as http_requests
from flask import Blueprint, request, jsonify, session, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity

from backend.extensions import db
from backend.models import User, UserProfile

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/google", methods=["POST"])
def auth_google():
    """Verify Google ID token, create/find user, return JWT tokens."""
    credential = request.json.get("credential", "")
    if not credential:
        return jsonify({"status": "error", "message": "No credential"}), 400
    try:
        resp = http_requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
            timeout=5,
        )
        if resp.status_code != 200:
            return jsonify({"status": "error", "message": "Invalid token"}), 401
        payload = resp.json()
        client_id = current_app.config.get("GOOGLE_CLIENT_ID")
        if client_id and payload.get("aud") != client_id:
            return jsonify({"status": "error", "message": "Token audience mismatch"}), 401

        google_sub = payload.get("sub", "")
        email = payload.get("email", "")
        name = payload.get("name", email)
        picture = payload.get("picture", "")

        # Find or create user
        user = User.query.filter_by(google_sub=google_sub).first()
        if not user:
            user = User(google_sub=google_sub, email=email, name=name, picture=picture)
            db.session.add(user)
            db.session.flush()
            # Create default profile
            profile = UserProfile(user_id=user.id)
            db.session.add(profile)
            db.session.commit()
            logger.info(f"New user created: {email}")
        else:
            user.name = name
            user.picture = picture
            db.session.commit()

        # Also set session for web compatibility
        session["user"] = user.to_dict()

        # Generate JWT tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        return jsonify({
            "status": "ok",
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token,
        })
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token."""
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({"status": "ok", "access_token": access_token})


@auth_bp.route("/me", methods=["GET"])
def auth_me():
    """Get current user from session (web) or JWT (mobile)."""
    # Try JWT first
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            user = User.query.get(int(identity))
            if user:
                return jsonify({"status": "ok", "user": user.to_dict()})
    except Exception:
        pass
    # Fall back to session (web)
    user_data = session.get("user", None)
    if user_data:
        return jsonify({"status": "ok", "user": user_data})
    return jsonify({"status": "ok", "user": None})


@auth_bp.route("/logout", methods=["POST"])
def auth_logout():
    session.pop("user", None)
    return jsonify({"status": "ok"})
