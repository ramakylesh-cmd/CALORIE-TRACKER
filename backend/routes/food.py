# =============================================================================
# NutriPulse — Food Routes
# =============================================================================
import uuid
from datetime import date
from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

from backend.extensions import db, limiter
from backend.models import User, FoodLog, UserProfile
from backend.services.nutrition_db import fuzzy_match, scale, get_suggestions, NUTRITION_DB
from backend.services.goal_calculator import calc_goals
from backend.services.insight_engine import generate_insights
from backend.utils.parser import parse_smart_input

food_bp = Blueprint("food", __name__)


def _get_current_user_id():
    """Get user ID from JWT or session. Returns None for anonymous."""
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


def _get_user_profile_dict(user_id):
    """Get profile dict for goal calculation."""
    if user_id:
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if profile:
            return profile.to_dict()
    return session.get("user_profile", {
        "gender": "male", "age": 25, "height_cm": 175,
        "weight_kg": 70, "activity": "moderate", "goal": "maintain",
    })


def _get_today_entries(user_id):
    """Get today's food log entries for a user."""
    if user_id:
        entries = FoodLog.query.filter_by(user_id=user_id, date=date.today()).order_by(FoodLog.logged_at).all()
        return [e.to_dict() for e in entries]
    return session.get("food_log", [])


def _get_goals_and_insights(user_id):
    """Calculate goals and insights for current user."""
    profile_dict = _get_user_profile_dict(user_id)
    goals = calc_goals(profile_dict)
    entries = _get_today_entries(user_id)
    insights = generate_insights(entries, goals)
    return goals, insights


@food_bp.route("/get_totals", methods=["GET"])
def get_totals():
    user_id = _get_current_user_id()
    profile_dict = _get_user_profile_dict(user_id)
    goals = calc_goals(profile_dict)
    entries = _get_today_entries(user_id)
    insights = generate_insights(entries, goals)
    # Water
    if user_id:
        from backend.models import WaterLog
        total_water = db.session.query(
            db.func.coalesce(db.func.sum(WaterLog.amount_ml), 0)
        ).filter_by(user_id=user_id, date=date.today()).scalar()
        water = {"consumed_ml": float(total_water), "goal_ml": 2500}
    else:
        water = session.get("water_log", {"consumed_ml": 0, "goal_ml": 2500})
    return jsonify({
        "entries": entries, "status": "ok", "insights": insights,
        "goals": goals, "water": water, "profile": profile_dict,
    })


@food_bp.route("/add_food", methods=["POST"])
@limiter.limit("60 per minute")
def add_food():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Invalid request body"}), 400
    raw_food = str(data.get("food_name", "")).strip()
    raw_qty = data.get("quantity", None)
    if not raw_food:
        return jsonify({"status": "error", "message": "Food name cannot be empty"}), 400
    parsed_food, parsed_qty = parse_smart_input(raw_food)
    if raw_qty is not None:
        try:
            quantity = float(raw_qty)
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Quantity must be a number"}), 400
    elif parsed_qty is not None:
        quantity = parsed_qty
    else:
        return jsonify({"status": "error", "message": "Please provide a quantity in grams."}), 400
    if quantity <= 0:
        return jsonify({"status": "error", "message": "Quantity must be greater than 0"}), 400
    if quantity > 5000:
        return jsonify({"status": "error", "message": "Quantity seems unrealistic (max 5000g)"}), 400

    food_name = parsed_food.lower().strip()
    matched_key, score = fuzzy_match(food_name)
    if not matched_key or score < 0.3:
        suggestions = get_suggestions(food_name)
        return jsonify({"status": "not_found", "message": f'"{food_name}" not found.', "suggestions": suggestions}), 404

    nd = NUTRITION_DB[matched_key]
    entry_id = str(uuid.uuid4())
    entry_data = {
        "id": entry_id,
        "food_name": matched_key.title(),
        "quantity_g": round(quantity, 1),
        "calories": scale(nd["calories"], quantity),
        "protein": scale(nd["protein"], quantity),
        "carbs": scale(nd["carbs"], quantity),
        "fats": scale(nd["fats"], quantity),
        "matched_score": round(score, 2),
    }

    user_id = _get_current_user_id()
    if user_id:
        log_entry = FoodLog(
            id=entry_id, user_id=user_id, food_name=matched_key.title(),
            quantity_g=round(quantity, 1), calories=entry_data["calories"],
            protein=entry_data["protein"], carbs=entry_data["carbs"],
            fats=entry_data["fats"], matched_score=round(score, 2), source="manual",
        )
        db.session.add(log_entry)
        db.session.commit()
    else:
        log = session.get("food_log", [])
        log.append(entry_data)
        session["food_log"] = log
        session.modified = True

    goals, insights = _get_goals_and_insights(user_id)
    return jsonify({
        "status": "ok", "entry": entry_data, "insights": insights, "goals": goals,
        "matched": matched_key != food_name.lower(),
        "matched_as": matched_key if matched_key != food_name.lower() else None,
    })


@food_bp.route("/add_ai_entry", methods=["POST"])
@limiter.limit("60 per minute")
def add_ai_entry():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Invalid request body"}), 400
    food_name = str(data.get("food_name", "")).strip()
    quantity_g = data.get("quantity_g")
    nutrition = data.get("nutrition", {})
    if not food_name:
        return jsonify({"status": "error", "message": "Food name cannot be empty"}), 400
    try:
        quantity_g = float(quantity_g)
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Quantity must be a number"}), 400
    if quantity_g <= 0 or quantity_g > 5000:
        return jsonify({"status": "error", "message": "Quantity out of range"}), 400
    try:
        calories = round(float(nutrition.get("calories", 0)), 1)
        protein = round(float(nutrition.get("protein", 0)), 1)
        carbs = round(float(nutrition.get("carbs", 0)), 1)
        fats = round(float(nutrition.get("fats", 0)), 1)
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Invalid nutrition values"}), 400
    if min(calories, protein, carbs, fats) < 0:
        return jsonify({"status": "error", "message": "Nutrition values cannot be negative"}), 400

    entry_id = str(uuid.uuid4())
    entry_data = {
        "id": entry_id, "food_name": food_name.title(),
        "quantity_g": round(quantity_g, 1), "calories": calories,
        "protein": protein, "carbs": carbs, "fats": fats, "matched_score": 1.0,
    }

    user_id = _get_current_user_id()
    if user_id:
        log_entry = FoodLog(
            id=entry_id, user_id=user_id, food_name=food_name.title(),
            quantity_g=round(quantity_g, 1), calories=calories,
            protein=protein, carbs=carbs, fats=fats, source="ai",
        )
        db.session.add(log_entry)
        db.session.commit()
    else:
        log = session.get("food_log", [])
        log.append(entry_data)
        session["food_log"] = log
        session.modified = True

    goals, insights = _get_goals_and_insights(user_id)
    return jsonify({"status": "ok", "entry": entry_data, "insights": insights, "goals": goals})


@food_bp.route("/delete_entry", methods=["POST"])
def delete_entry():
    data = request.get_json(silent=True)
    entry_id = data.get("id") if data else None
    if not entry_id:
        return jsonify({"status": "error", "message": "No ID provided"}), 400

    user_id = _get_current_user_id()
    if user_id:
        entry = FoodLog.query.filter_by(id=entry_id, user_id=user_id).first()
        if not entry:
            return jsonify({"status": "error", "message": "Entry not found"}), 404
        db.session.delete(entry)
        db.session.commit()
    else:
        log = session.get("food_log", [])
        before = len(log)
        log = [e for e in log if e["id"] != entry_id]
        if len(log) >= before:
            return jsonify({"status": "error", "message": "Entry not found"}), 404
        session["food_log"] = log
        session.modified = True

    goals, insights = _get_goals_and_insights(user_id)
    return jsonify({"status": "ok", "insights": insights, "goals": goals})


@food_bp.route("/clear_log", methods=["POST"])
def clear_log():
    user_id = _get_current_user_id()
    if user_id:
        FoodLog.query.filter_by(user_id=user_id, date=date.today()).delete()
        db.session.commit()
    else:
        session["food_log"] = []
        session.modified = True
    return jsonify({"status": "ok", "insights": []})
