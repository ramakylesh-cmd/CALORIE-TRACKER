# =============================================================================
# NutriPulse — Search Routes
# =============================================================================
from flask import Blueprint, request, jsonify
from backend.services.nutrition_db import search_foods, lookup_barcode
from backend.services.usda_service import query_usda
from backend.utils.parser import parse_smart_input
from backend.services.nutrition_db import fuzzy_match
from backend.extensions import limiter

search_bp = Blueprint("search", __name__)


@search_bp.route("/search_foods", methods=["GET"])
def search_foods_route():
    q = request.args.get("q", "").strip().lower()
    results = search_foods(q)
    return jsonify({"results": results})


@search_bp.route("/scan_barcode", methods=["POST"])
def scan_barcode():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Invalid request"}), 400
    barcode = str(data.get("barcode", "")).strip()
    if not barcode:
        return jsonify({"status": "error", "message": "No barcode provided"}), 400
    result = lookup_barcode(barcode)
    if not result:
        return jsonify({
            "status": "not_found",
            "message": f"Barcode {barcode} not recognised. Add food manually.",
        }), 404
    return jsonify({"status": "ok", **result})


@search_bp.route("/parse_input", methods=["POST"])
@limiter.limit("120 per minute")
def parse_input():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error"}), 400
    raw = str(data.get("input", "")).strip()
    parsed_food, parsed_qty = parse_smart_input(raw)
    matched_key, score = fuzzy_match(parsed_food)
    return jsonify({
        "status": "ok", "parsed_food": parsed_food, "parsed_qty": parsed_qty,
        "matched_food": matched_key, "confidence": round(score, 2),
    })


@search_bp.route("/search_usda", methods=["GET"])
def search_usda_route():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"status": "error", "message": "Query required"}), 400
    result = query_usda(q)
    if result:
        return jsonify({"status": "ok", "result": result})
    return jsonify({"status": "not_found", "message": f"No USDA result for '{q}'"}), 404
