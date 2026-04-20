# =============================================================================
# NutriPulse — Photo Analysis Routes
# =============================================================================
import logging
from flask import Blueprint, request, jsonify
from backend.extensions import limiter
from backend.services.ai_service import analyze_photo

logger = logging.getLogger(__name__)
photo_bp = Blueprint("photo", __name__)


@photo_bp.route("/analyze_photo", methods=["POST"])
@limiter.limit("15 per minute; 80 per hour")
def analyze_photo_route():
    try:
        data = request.get_json(silent=True)
        if not data or "image" not in data:
            return jsonify({"status": "error", "message": "No image provided"}), 400

        image_url = data["image"]
        manual_name = str(data.get("manual_name", "")).strip()
        manual_grams = data.get("manual_grams")
        try:
            manual_grams = float(manual_grams) if manual_grams else None
        except (ValueError, TypeError):
            manual_grams = None

        result = analyze_photo(image_url, manual_name, manual_grams)

        if result.get("code") == 429:
            return jsonify(result), 429
        if result.get("status") == "error":
            return jsonify(result), 500
        if result.get("status") == "not_found":
            return jsonify(result), 404

        return jsonify(result)

    except Exception as e:
        logger.error(f"analyze_photo error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
