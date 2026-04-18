from flask import Flask, request, jsonify, render_template, session
import uuid
import re
import base64
import json
import os
from dotenv import load_dotenv
from openai import OpenAI
import requests

load_dotenv()

# OpenAI
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# USDA — used inline in route:
# requests.get(f"https://api.nal.usda.gov/fdc/v1/foods/search?query={q}&api_key={os.getenv('USDA_API_KEY')}")
USDA_API_KEY = os.getenv("USDA_API_KEY")

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "nutripulse_ultra_v2_2024_xk9q")
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False  # set True if HTTPS only
app.config["PERMANENT_SESSION_LIFETIME"] = 86400 * 30  # 30 days



# ─── COMPREHENSIVE NUTRITION DATASET (per 100g) ──────────────────────────────
NUTRITION_DB = {
    "apple":              {"calories": 52,  "protein": 0.3,  "carbs": 14.0, "fats": 0.2},
    "banana":             {"calories": 89,  "protein": 1.1,  "carbs": 23.0, "fats": 0.3},
    "orange":             {"calories": 47,  "protein": 0.9,  "carbs": 12.0, "fats": 0.1},
    "grapes":             {"calories": 69,  "protein": 0.7,  "carbs": 18.0, "fats": 0.2},
    "watermelon":         {"calories": 30,  "protein": 0.6,  "carbs": 7.6,  "fats": 0.2},
    "strawberries":       {"calories": 32,  "protein": 0.7,  "carbs": 7.7,  "fats": 0.3},
    "mango":              {"calories": 60,  "protein": 0.8,  "carbs": 15.0, "fats": 0.4},
    "pineapple":          {"calories": 50,  "protein": 0.5,  "carbs": 13.0, "fats": 0.1},
    "blueberries":        {"calories": 57,  "protein": 0.7,  "carbs": 14.0, "fats": 0.3},
    "kiwi":               {"calories": 61,  "protein": 1.1,  "carbs": 15.0, "fats": 0.5},
    "chicken breast":     {"calories": 165, "protein": 31.0, "carbs": 0.0,  "fats": 3.6},
    "chicken thigh":      {"calories": 209, "protein": 26.0, "carbs": 0.0,  "fats": 11.0},
    "egg":                {"calories": 155, "protein": 13.0, "carbs": 1.1,  "fats": 11.0},
    "egg white":          {"calories": 52,  "protein": 11.0, "carbs": 0.7,  "fats": 0.2},
    "whole milk":         {"calories": 61,  "protein": 3.2,  "carbs": 4.8,  "fats": 3.3},
    "skim milk":          {"calories": 34,  "protein": 3.4,  "carbs": 5.0,  "fats": 0.1},
    "cheddar cheese":     {"calories": 402, "protein": 25.0, "carbs": 1.3,  "fats": 33.0},
    "greek yogurt":       {"calories": 59,  "protein": 10.0, "carbs": 3.6,  "fats": 0.4},
    "whey protein":       {"calories": 400, "protein": 80.0, "carbs": 8.0,  "fats": 5.0},
    "white rice":         {"calories": 130, "protein": 2.7,  "carbs": 28.0, "fats": 0.3},
    "brown rice":         {"calories": 112, "protein": 2.6,  "carbs": 24.0, "fats": 0.9},
    "oats":               {"calories": 389, "protein": 17.0, "carbs": 66.0, "fats": 7.0},
    "white bread":        {"calories": 265, "protein": 9.0,  "carbs": 49.0, "fats": 3.2},
    "whole wheat bread":  {"calories": 247, "protein": 13.0, "carbs": 41.0, "fats": 4.2},
    "pasta":              {"calories": 131, "protein": 5.0,  "carbs": 25.0, "fats": 1.1},
    "quinoa":             {"calories": 120, "protein": 4.4,  "carbs": 22.0, "fats": 1.9},
    "almonds":            {"calories": 579, "protein": 21.0, "carbs": 22.0, "fats": 50.0},
    "peanut butter":      {"calories": 588, "protein": 25.0, "carbs": 20.0, "fats": 50.0},
    "cashews":            {"calories": 553, "protein": 18.0, "carbs": 30.0, "fats": 44.0},
    "salmon":             {"calories": 208, "protein": 20.0, "carbs": 0.0,  "fats": 13.0},
    "tuna":               {"calories": 144, "protein": 30.0, "carbs": 0.0,  "fats": 1.0},
    "shrimp":             {"calories": 99,  "protein": 24.0, "carbs": 0.2,  "fats": 0.3},
    "broccoli":           {"calories": 34,  "protein": 2.8,  "carbs": 7.0,  "fats": 0.4},
    "spinach":            {"calories": 23,  "protein": 2.9,  "carbs": 3.6,  "fats": 0.4},
    "sweet potato":       {"calories": 86,  "protein": 1.6,  "carbs": 20.0, "fats": 0.1},
    "avocado":            {"calories": 160, "protein": 2.0,  "carbs": 9.0,  "fats": 15.0},
    "olive oil":          {"calories": 884, "protein": 0.0,  "carbs": 0.0,  "fats": 100.0},
    "dark chocolate":     {"calories": 546, "protein": 5.0,  "carbs": 60.0, "fats": 31.0},
    "lentils":            {"calories": 116, "protein": 9.0,  "carbs": 20.0, "fats": 0.4},
    "black beans":        {"calories": 132, "protein": 8.9,  "carbs": 24.0, "fats": 0.5},
    "chickpeas":          {"calories": 164, "protein": 8.9,  "carbs": 27.0, "fats": 2.6},
    "cottage cheese":     {"calories": 98,  "protein": 11.0, "carbs": 3.4,  "fats": 4.3},
    "beef (lean)":        {"calories": 250, "protein": 26.0, "carbs": 0.0,  "fats": 15.0},
    "ground beef":        {"calories": 332, "protein": 25.0, "carbs": 0.0,  "fats": 25.0},
    "tofu":               {"calories": 76,  "protein": 8.0,  "carbs": 1.9,  "fats": 4.8},
    "tempeh":             {"calories": 193, "protein": 19.0, "carbs": 9.4,  "fats": 11.0},
    "walnuts":            {"calories": 654, "protein": 15.0, "carbs": 14.0, "fats": 65.0},
    "butter":             {"calories": 717, "protein": 0.9,  "carbs": 0.1,  "fats": 81.0},
    "honey":              {"calories": 304, "protein": 0.3,  "carbs": 82.0, "fats": 0.0},
    "carrot":             {"calories": 41,  "protein": 0.9,  "carbs": 10.0, "fats": 0.2},
    "tomato":             {"calories": 18,  "protein": 0.9,  "carbs": 3.9,  "fats": 0.2},
    "cucumber":           {"calories": 16,  "protein": 0.7,  "carbs": 3.6,  "fats": 0.1},
    "bell pepper":        {"calories": 31,  "protein": 1.0,  "carbs": 6.0,  "fats": 0.3},
    "onion":              {"calories": 40,  "protein": 1.1,  "carbs": 9.3,  "fats": 0.1},
    "garlic":             {"calories": 149, "protein": 6.4,  "carbs": 33.0, "fats": 0.5},
    "mixed nuts":         {"calories": 607, "protein": 20.0, "carbs": 21.0, "fats": 54.0},
    "protein bar":        {"calories": 350, "protein": 30.0, "carbs": 35.0, "fats": 10.0},
    "granola":            {"calories": 471, "protein": 10.0, "carbs": 64.0, "fats": 20.0},
    "pizza":              {"calories": 266, "protein": 11.0, "carbs": 33.0, "fats": 10.0},
    "burger":             {"calories": 295, "protein": 17.0, "carbs": 24.0, "fats": 14.0},
    "french fries":       {"calories": 312, "protein": 3.4,  "carbs": 41.0, "fats": 15.0},
    "ice cream":          {"calories": 207, "protein": 3.5,  "carbs": 24.0, "fats": 11.0},
    "orange juice":       {"calories": 45,  "protein": 0.7,  "carbs": 10.0, "fats": 0.2},
    "coffee":             {"calories": 2,   "protein": 0.3,  "carbs": 0.0,  "fats": 0.0},
    "green tea":          {"calories": 1,   "protein": 0.2,  "carbs": 0.0,  "fats": 0.0},
}

# ─── UNIT CONVERSION ────────────────────────────────────────────────────────
UNIT_TO_GRAMS = {
    "g": 1, "gram": 1, "grams": 1,
    "kg": 1000, "kilogram": 1000, "kilograms": 1000,
    "oz": 28.35, "ounce": 28.35, "ounces": 28.35,
    "lb": 453.6, "pound": 453.6, "pounds": 453.6,
    "ml": 1, "milliliter": 1, "milliliters": 1,
    "l": 1000, "liter": 1000, "liters": 1000,
    "cup": 240, "cups": 240,
    "tbsp": 15, "tablespoon": 15, "tablespoons": 15,
    "tsp": 5, "teaspoon": 5, "teaspoons": 5,
    "serving": 100, "servings": 100,
    "piece": 100, "pieces": 100,
    "slice": 30, "slices": 30,
    "scoop": 35, "scoops": 35,
    "handful": 40, "handfuls": 40,
}

FOOD_ALIASES = {
    "chicken": "chicken breast", "rice": "white rice", "bread": "white bread",
    "milk": "whole milk", "yogurt": "greek yogurt", "pb": "peanut butter",
    "choc": "dark chocolate", "chocolate": "dark chocolate", "fish": "salmon",
    "beans": "black beans", "potato": "sweet potato", "cheese": "cheddar cheese",
    "oil": "olive oil", "beef": "beef (lean)", "eggs": "egg", "oatmeal": "oats",
    "porridge": "oats", "spaghetti": "pasta", "noodles": "pasta", "nuts": "almonds",
    "peanuts": "almonds", "turkey": "chicken breast", "taters": "sweet potato",
    "prot": "whey protein", "protein powder": "whey protein", "shake": "whey protein",
}

BARCODE_DB = {
    "016000275287": {"name": "cheerios",          "food": "oats",             "quantity_g": 100},
    "038000845581": {"name": "special k cereal",  "food": "oats",             "quantity_g": 100},
    "021130126026": {"name": "salmon fillet",     "food": "salmon",           "quantity_g": 100},
    "070470003218": {"name": "peanut butter jar", "food": "peanut butter",    "quantity_g": 100},
    "036800397965": {"name": "greek yogurt cup",  "food": "greek yogurt",     "quantity_g": 150},
    "041303011157": {"name": "whole wheat bread", "food": "whole wheat bread","quantity_g": 100},
    "011110038364": {"name": "brown rice bag",    "food": "brown rice",       "quantity_g": 100},
}

# ─── PHOTO ANALYSIS - LOCAL FALLBACK ────────────────────────────────────────
PHOTO_FOOD_KEYWORDS = {
    "pizza": "pizza", "burger": "burger", "salad": "spinach", "chicken": "chicken breast",
    "rice": "white rice", "pasta": "pasta", "egg": "egg", "banana": "banana",
    "apple": "apple", "sandwich": "whole wheat bread", "soup": "tomato",
    "steak": "beef (lean)", "fish": "salmon", "broccoli": "broccoli",
    "avocado": "avocado", "oatmeal": "oats", "yogurt": "greek yogurt",
    "chocolate": "dark chocolate", "nuts": "almonds", "fries": "french fries",
    "sushi": "tuna", "toast": "whole wheat bread", "smoothie": "banana",
}


def _scale(nutrient_val, quantity_g):
    return round(nutrient_val * quantity_g / 100, 1)


def _get_log():
    if "food_log" not in session:
        session["food_log"] = []
    return session["food_log"]


def _save_log(log):
    session["food_log"] = log
    session.modified = True


def _get_profile():
    return session.get("user_profile", {
        "gender": "male", "age": 25, "height_cm": 175, "weight_kg": 70,
        "activity": "moderate", "goal": "maintain"
    })


def _get_water():
    return session.get("water_log", {"consumed_ml": 0, "goal_ml": 2500})


def _calc_goals(profile):
    """Mifflin-St Jeor BMR + TDEE"""
    gender = profile.get("gender", "male")
    age = float(profile.get("age", 25))
    h = float(profile.get("height_cm", 175))
    w = float(profile.get("weight_kg", 70))

    if gender == "female":
        bmr = 10 * w + 6.25 * h - 5 * age - 161
    else:
        bmr = 10 * w + 6.25 * h - 5 * age + 5

    multipliers = {
        "sedentary": 1.2, "light": 1.375, "moderate": 1.55,
        "active": 1.725, "very_active": 1.9
    }
    tdee = bmr * multipliers.get(profile.get("activity", "moderate"), 1.55)

    goal = profile.get("goal", "maintain")
    if goal == "lose":
        cal_goal = tdee - 500
    elif goal == "gain":
        cal_goal = tdee + 300
    else:
        cal_goal = tdee

    cal_goal = max(1200, round(cal_goal))
    protein_goal = round(w * 1.8)
    carbs_goal = round((cal_goal * 0.45) / 4)
    fats_goal = round((cal_goal * 0.25) / 9)

    return {
        "bmr": round(bmr),
        "tdee": round(tdee),
        "calories": cal_goal,
        "protein": protein_goal,
        "carbs": carbs_goal,
        "fats": fats_goal,
    }


def _fuzzy_match(query):
    query = query.lower().strip()
    if query in NUTRITION_DB:
        return query, 1.0
    if query in FOOD_ALIASES:
        alias = FOOD_ALIASES[query]
        if alias in NUTRITION_DB:
            return alias, 0.95
    for key in NUTRITION_DB:
        if key.startswith(query) or query.startswith(key):
            return key, 0.9
    matches = [(k, len(k)) for k in NUTRITION_DB if query in k or k in query]
    if matches:
        best = min(matches, key=lambda x: abs(x[1] - len(query)))
        return best[0], 0.8
    query_words = set(query.split())
    best_key, best_score = None, 0
    for key in NUTRITION_DB:
        key_words = set(key.split())
        overlap = len(query_words & key_words)
        score = overlap / max(len(query_words), len(key_words))
        if score > best_score:
            best_score, best_key = score, key
    if best_score >= 0.4:
        return best_key, best_score * 0.7

    def trigrams(s):
        return set(s[i:i+3] for i in range(len(s)-2))

    qg = trigrams(query)
    best_key, best_score = None, 0
    for key in NUTRITION_DB:
        kg = trigrams(key)
        if not qg or not kg:
            continue
        sim = len(qg & kg) / len(qg | kg)
        if sim > best_score:
            best_score, best_key = sim, key
    if best_score >= 0.3:
        return best_key, best_score * 0.6
    return None, 0.0


def _suggestions(query):
    query = query.lower().strip()
    results = []
    qwords = set(query.split())
    for key in NUTRITION_DB:
        kwords = set(key.split())
        if qwords & kwords:
            results.append(key)
    if not results:
        for key in NUTRITION_DB:
            if any(query[:3] in k for k in key.split()):
                results.append(key)
    return results[:5]


def _parse_smart_input(raw_input):
    raw = raw_input.strip().lower()
    pattern = r'^(\d+(?:\.\d+)?)\s*([a-z]+)?\s+(.+)$'
    m = re.match(pattern, raw)
    if m:
        qty_str, unit_str, food_str = m.group(1), m.group(2) or "", m.group(3)
        qty = float(qty_str)
        unit_str = unit_str.lower().strip()
        multiplier = UNIT_TO_GRAMS.get(unit_str, None)
        if multiplier:
            return food_str.strip(), qty * multiplier
        else:
            food_str = (unit_str + " " + food_str).strip()
            return food_str, qty
    fraction_map = {"half": 0.5, "quarter": 0.25, "third": 0.333}
    for word, frac in fraction_map.items():
        if raw.startswith(word + " "):
            food_part = raw[len(word)+1:].strip()
            return food_part, frac * 100
    return raw, None


def _local_ai_feedback(entries, goals):
    if not entries:
        return []
    total_cal = sum(e["calories"] for e in entries)
    total_protein = sum(e["protein"] for e in entries)
    total_carbs = sum(e["carbs"] for e in entries)
    total_fats = sum(e["fats"] for e in entries)
    goal_cal = goals.get("calories", 2000)
    pct = total_cal / goal_cal if goal_cal > 0 else 0
    insights = []
    if pct < 0.25:
        insights.append({"type": "warning", "icon": "⚡", "msg": "Very low calorie intake — fuel up!"})
    elif pct < 0.5:
        insights.append({"type": "info", "icon": "🌱", "msg": f"At {int(pct*100)}% of daily goal — keep logging."})
    elif pct < 0.85:
        insights.append({"type": "success", "icon": "🎯", "msg": f"On track — {int(goal_cal - total_cal)} kcal remaining."})
    elif pct < 1.0:
        insights.append({"type": "warning", "icon": "⚠️", "msg": f"Almost at limit — {int(goal_cal - total_cal)} kcal left."})
    else:
        insights.append({"type": "danger", "icon": "🔴", "msg": f"Surplus of {int(total_cal - goal_cal)} kcal detected."})
    goal_p = goals.get("protein", 150)
    if total_protein > goal_p * 0.8:
        insights.append({"type": "success", "icon": "💪", "msg": "Protein target nearly met — great for muscle!"})
    elif total_protein < goal_p * 0.25 and total_cal > 400:
        insights.append({"type": "warning", "icon": "🥩", "msg": "Low protein — add a lean protein source."})
    if total_fats > goals.get("fats", 65) * 1.3:
        insights.append({"type": "warning", "icon": "🧈", "msg": "High fat intake — balance with lean proteins."})
    if total_carbs > goals.get("carbs", 300) * 1.2:
        insights.append({"type": "info", "icon": "🌾", "msg": "High carb day — great for energy & training."})
    if total_protein > 0 and total_carbs > 0 and total_fats > 0:
        insights.append({"type": "success", "icon": "✅", "msg": "All macros tracked — balanced log."})
    return insights[:4]


# ─── ROUTES ──────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    session.permanent = True
    return render_template("index.html")


@app.route("/get_totals", methods=["GET"])
def get_totals():
    log = _get_log()
    profile = _get_profile()
    goals = _calc_goals(profile)
    water = _get_water()
    insights = _local_ai_feedback(log, goals)
    return jsonify({"entries": log, "status": "ok", "insights": insights, "goals": goals, "water": water, "profile": profile})


@app.route("/add_food", methods=["POST"])
def add_food():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Invalid request body"}), 400
    raw_food = str(data.get("food_name", "")).strip()
    raw_qty = data.get("quantity", None)
    if not raw_food:
        return jsonify({"status": "error", "message": "Food name cannot be empty"}), 400
    parsed_food, parsed_qty = _parse_smart_input(raw_food)
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
    matched_key, score = _fuzzy_match(food_name)
    if not matched_key or score < 0.3:
        suggestions = _suggestions(food_name)
        return jsonify({"status": "not_found", "message": f'"{food_name}" not found.', "suggestions": suggestions}), 404
    nd = NUTRITION_DB[matched_key]
    entry = {
        "id": str(uuid.uuid4())[:8],
        "food_name": matched_key.title(),
        "quantity_g": round(quantity, 1),
        "calories": _scale(nd["calories"], quantity),
        "protein":  _scale(nd["protein"],  quantity),
        "carbs":    _scale(nd["carbs"],    quantity),
        "fats":     _scale(nd["fats"],     quantity),
        "matched_score": round(score, 2),
    }
    log = _get_log()
    log.append(entry)
    _save_log(log)
    profile = _get_profile()
    goals = _calc_goals(profile)
    insights = _local_ai_feedback(log, goals)
    return jsonify({
        "status": "ok", "entry": entry, "insights": insights, "goals": goals,
        "matched": matched_key != food_name.lower(),
        "matched_as": matched_key if matched_key != food_name.lower() else None
    })


@app.route("/delete_entry", methods=["POST"])
def delete_entry():
    data = request.get_json(silent=True)
    entry_id = data.get("id") if data else None
    if not entry_id:
        return jsonify({"status": "error", "message": "No ID provided"}), 400
    log = _get_log()
    before = len(log)
    log = [e for e in log if e["id"] != entry_id]
    if len(log) < before:
        _save_log(log)
        profile = _get_profile()
        goals = _calc_goals(profile)
        insights = _local_ai_feedback(log, goals)
        return jsonify({"status": "ok", "insights": insights, "goals": goals})
    return jsonify({"status": "error", "message": "Entry not found"}), 404


@app.route("/clear_log", methods=["POST"])
def clear_log():
    _save_log([])
    return jsonify({"status": "ok", "insights": []})


@app.route("/scan_barcode", methods=["POST"])
def scan_barcode():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Invalid request"}), 400
    barcode = str(data.get("barcode", "")).strip()
    if not barcode:
        return jsonify({"status": "error", "message": "No barcode provided"}), 400
    if barcode not in BARCODE_DB:
        return jsonify({"status": "not_found", "message": f"Barcode {barcode} not recognised. Add food manually."}), 404
    bc_entry = BARCODE_DB[barcode]
    food_key = bc_entry.get("food")
    if not food_key or food_key not in NUTRITION_DB:
        return jsonify({"status": "not_found", "message": f'"{bc_entry["name"]}" found but has no nutrition data.'}), 404
    nd = NUTRITION_DB[food_key]
    qty = bc_entry.get("quantity_g", 100)
    return jsonify({
        "status": "ok", "food_name": food_key, "quantity_g": qty,
        "preview": {
            "calories": _scale(nd["calories"], qty), "protein": _scale(nd["protein"], qty),
            "carbs": _scale(nd["carbs"], qty), "fats": _scale(nd["fats"], qty),
        }
    })


@app.route("/search_foods", methods=["GET"])
def search_foods():
    q = request.args.get("q", "").strip().lower()
    if not q:
        return jsonify({"results": list(NUTRITION_DB.keys())})
    scored = []
    for key in NUTRITION_DB:
        if q in key:
            scored.append((key, 1.0))
        elif key.startswith(q[:3]):
            scored.append((key, 0.7))
        elif any(w.startswith(q) for w in key.split()):
            scored.append((key, 0.5))
    scored.sort(key=lambda x: -x[1])
    return jsonify({"results": [k for k, _ in scored[:15]]})


@app.route("/parse_input", methods=["POST"])
def parse_input():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error"}), 400
    raw = str(data.get("input", "")).strip()
    parsed_food, parsed_qty = _parse_smart_input(raw)
    matched_key, score = _fuzzy_match(parsed_food)
    return jsonify({
        "status": "ok", "parsed_food": parsed_food, "parsed_qty": parsed_qty,
        "matched_food": matched_key, "confidence": round(score, 2),
    })


@app.route("/update_profile", methods=["POST"])
def update_profile():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error"}), 400
    profile = {
        "gender": data.get("gender", "male"),
        "age": max(10, min(100, int(data.get("age", 25)))),
        "height_cm": max(100, min(250, float(data.get("height_cm", 175)))),
        "weight_kg": max(30, min(300, float(data.get("weight_kg", 70)))),
        "activity": data.get("activity", "moderate"),
        "goal": data.get("goal", "maintain"),
    }
    session["user_profile"] = profile
    session.modified = True
    goals = _calc_goals(profile)
    return jsonify({"status": "ok", "profile": profile, "goals": goals})


@app.route("/add_water", methods=["POST"])
def add_water():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error"}), 400
    ml = float(data.get("ml", 0))
    if ml <= 0 or ml > 2000:
        return jsonify({"status": "error", "message": "Invalid water amount"}), 400
    water = _get_water()
    water["consumed_ml"] = min(water["consumed_ml"] + ml, water["goal_ml"] * 2)
    session["water_log"] = water
    session.modified = True
    return jsonify({"status": "ok", "water": water})


@app.route("/reset_water", methods=["POST"])
def reset_water():
    water = {"consumed_ml": 0, "goal_ml": 2500}
    session["water_log"] = water
    session.modified = True
    return jsonify({"status": "ok", "water": water})


# ─── USDA FoodData Central fallback ─────────────────────────────────────
def _query_usda(query):
    """Query USDA FoodData Central API as a fallback for unknown foods."""
    api_key = USDA_API_KEY or "DEMO_KEY"
    try:
        resp = requests.get(
            "https://api.nal.usda.gov/fdc/v1/foods/search",
            params={
                "query": query, "api_key": api_key,
                "pageSize": 1, "dataType": "Foundation,SR Legacy,Survey (FNDDS)"
            },
            timeout=4
        )
        resp.raise_for_status()
        foods = resp.json().get("foods", [])
        if not foods:
            return None
        food = foods[0]
        nut = {n.get("nutrientName", ""): n.get("value", 0) for n in food.get("foodNutrients", [])}
        calories = nut.get("Energy", 0)
        if calories == 0:
            return None
        return {
            "name": food.get("description", query).lower()[:50],
            "calories": round(float(calories), 1),
            "protein":  round(float(nut.get("Protein", 0)), 1),
            "carbs":    round(float(nut.get("Carbohydrate, by difference", 0)), 1),
            "fats":     round(float(nut.get("Total lipid (fat)", 0)), 1),
        }
    except Exception:
        return None


@app.route("/analyze_photo", methods=["POST"])
def analyze_photo():
    try:
        data = request.get_json(silent=True)
        if not data or "image" not in data:
            return jsonify({"status": "error", "message": "No image provided"}), 400

        image_url = data["image"]

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are a nutrition expert. Look at this food photo and identify "
                                "the main food item. Estimate its weight in grams as served. "
                                "Respond ONLY with a JSON object — no markdown, no extra text — "
                                "using exactly these two keys: "
                                '{"food_name": "name of the food", "quantity_g": 150}'
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        }
                    ]
                }
            ],
            max_tokens=100
        )

        raw = response.choices[0].message.content.strip()
        # Robust JSON extraction — strip markdown fences if present
        raw = re.sub(r"```json|```", "", raw).strip()
        try:
            ai_data = json.loads(raw)
        except json.JSONDecodeError:
            m = re.search(r'\{[^}]+\}', raw, re.DOTALL)
            if m:
                ai_data = json.loads(m.group())
            else:
                return jsonify({"status": "error", "message": "AI response could not be parsed. Try again."}), 500

        food_name = str(ai_data.get("food_name", "")).strip()
        quantity_g = float(ai_data.get("quantity_g", 100))

        matched_key, score = _fuzzy_match(food_name)

        # Fallback to USDA if local DB miss
        if (not matched_key or score < 0.2) and food_name:
            usda = _query_usda(food_name)
            if usda:
                NUTRITION_DB[usda["name"]] = {
                    "calories": usda["calories"], "protein": usda["protein"],
                    "carbs": usda["carbs"], "fats": usda["fats"]
                }
                matched_key, score = usda["name"], 0.9

        if not matched_key or score < 0.2:
            return jsonify({
                "status": "not_found",
                "message": f"AI identified '{food_name}', but it's not in our database. Add manually."
            })

        nd = NUTRITION_DB[matched_key]
        return jsonify({
            "status": "ok",
            "food_name": matched_key.title(),
            "quantity_g": round(quantity_g, 1),
            "nutrition": {
                "calories": _scale(nd["calories"], quantity_g),
                "protein":  _scale(nd["protein"],  quantity_g),
                "carbs":    _scale(nd["carbs"],     quantity_g),
                "fats":     _scale(nd["fats"],      quantity_g),
            }
        })

    except Exception as e:
        app.logger.error(f"analyze_photo error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/health")
def health():
    """Debug endpoint — check keys and config."""
    return jsonify({
        "status": "ok",
        "openai_key_set": bool(os.getenv("OPENAI_API_KEY")),
        "usda_key_set":   bool(os.getenv("USDA_API_KEY")),
        "db_foods": len(NUTRITION_DB),
    })


@app.route("/search_usda", methods=["GET"])
def search_usda_route():
    """Search USDA FoodData Central directly."""
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"status": "error", "message": "Query required"}), 400
    result = _query_usda(q)
    if result:
        return jsonify({"status": "ok", "result": result})
    return jsonify({"status": "not_found", "message": f"No USDA result for '{q}'"}), 404


if __name__ == "__main__":
   port = int(os.environ.get("PORT", 5000))
   app.run(host="0.0.0.0", port=port, debug=False)