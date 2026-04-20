# =============================================================================
# NutriPulse — Water Routes
# =============================================================================
from datetime import date
from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from backend.extensions import db
from backend.models import User, WaterLog

water_bp = Blueprint("water", __name__)


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


def _get_water_state(user_id):
    """Get current water consumption for today."""
    if user_id:
        total = db.session.query(
            db.func.coalesce(db.func.sum(WaterLog.amount_ml), 0)
        ).filter_by(user_id=user_id, date=date.today()).scalar()
        return {"consumed_ml": float(total), "goal_ml": 2500}
    return session.get("water_log", {"consumed_ml": 0, "goal_ml": 2500})


@water_bp.route("/add_water", methods=["POST"])
def add_water():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error"}), 400
    ml = float(data.get("ml", 0))
    if ml <= 0 or ml > 2000:
        return jsonify({"status": "error", "message": "Invalid water amount"}), 400

    user_id = _get_current_user_id()
    if user_id:
        entry = WaterLog(user_id=user_id, amount_ml=ml)
        db.session.add(entry)
        db.session.commit()
        water = _get_water_state(user_id)
    else:
        water = session.get("water_log", {"consumed_ml": 0, "goal_ml": 2500})
        water["consumed_ml"] = min(water["consumed_ml"] + ml, water["goal_ml"] * 2)
        session["water_log"] = water
        session.modified = True

    return jsonify({"status": "ok", "water": water})


@water_bp.route("/reset_water", methods=["POST"])
def reset_water():
    user_id = _get_current_user_id()
    if user_id:
        WaterLog.query.filter_by(user_id=user_id, date=date.today()).delete()
        db.session.commit()
        water = {"consumed_ml": 0, "goal_ml": 2500}
    else:
        water = {"consumed_ml": 0, "goal_ml": 2500}
        session["water_log"] = water
        session.modified = True

    return jsonify({"status": "ok", "water": water})
