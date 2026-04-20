# =============================================================================
# NutriPulse — Profile Routes
# =============================================================================
from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from backend.extensions import db
from backend.models import User, UserProfile
from backend.services.goal_calculator import calc_goals

profile_bp = Blueprint("profile", __name__)


def _get_current_user_id():
    """Get user ID from JWT or session."""
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            return int(identity)
    except Exception:
        pass
    user_data = session.get("user")
    if user_data and user_data.get("sub"):
        user = User.query.filter_by(google_sub=user_data["sub"]).first()
        if user:
            return user.id
    return None


@profile_bp.route("/update_profile", methods=["POST"])
def update_profile():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error"}), 400

    custom_cal = data.get("custom_calories")
    try:
        custom_cal = int(custom_cal) if custom_cal else None
        if custom_cal and (custom_cal < 500 or custom_cal > 10000):
            custom_cal = None
    except (ValueError, TypeError):
        custom_cal = None

    profile_data = {
        "gender": data.get("gender", "male"),
        "age": max(10, min(100, int(data.get("age", 25)))),
        "height_cm": max(100, min(250, float(data.get("height_cm", 175)))),
        "weight_kg": max(30, min(300, float(data.get("weight_kg", 70)))),
        "activity": data.get("activity", "moderate"),
        "goal": data.get("goal", "maintain"),
        "custom_calories": custom_cal,
    }

    user_id = _get_current_user_id()
    if user_id:
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.session.add(profile)
        profile.gender = profile_data["gender"]
        profile.age = profile_data["age"]
        profile.height_cm = profile_data["height_cm"]
        profile.weight_kg = profile_data["weight_kg"]
        profile.activity = profile_data["activity"]
        profile.goal = profile_data["goal"]
        profile.custom_calories = profile_data["custom_calories"]
        db.session.commit()
    else:
        session["user_profile"] = profile_data
        session.modified = True

    goals = calc_goals(profile_data)
    return jsonify({"status": "ok", "profile": profile_data, "goals": goals})
