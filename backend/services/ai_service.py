# =============================================================================
# NutriPulse — AI Service (Groq Vision + Text Pipeline)
# =============================================================================
import os
import re
import json
import logging
from openai import OpenAI
from backend.services.nutrition_db import fuzzy_match, scale, NUTRITION_DB
from backend.services.usda_service import query_usda

logger = logging.getLogger(__name__)

_groq_client = None

def _get_groq_client():
    global _groq_client
    if _groq_client is None:
        key = os.getenv("GROQ_API_KEY")
        if key:
            _groq_client = OpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")
    return _groq_client


def extract_quantity_from_text(text):
    if not text:
        return None
    g_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:g|gm|gram|grams)\b', text.lower())
    if g_match:
        try:
            qty = float(g_match.group(1))
            if 1 <= qty <= 5000:
                return qty
        except (TypeError, ValueError):
            pass
    n_match = re.search(r'\b(\d+(?:\.\d+)?)\b', text)
    if n_match:
        try:
            qty = float(n_match.group(1))
            if 1 <= qty <= 5000:
                return qty
        except (TypeError, ValueError):
            pass
    return None


def parse_manual_food_segments(manual_name, total_grams=None):
    if not manual_name:
        return []
    raw_parts = re.split(r'\s*(?:,|\+|/|\band\b|&)\s*', manual_name, flags=re.IGNORECASE)
    segments = []
    for part in raw_parts:
        chunk = part.strip()
        if not chunk:
            continue
        grams = extract_quantity_from_text(chunk)
        cleaned = re.sub(r'\babout|approx|approximately|around|near|~\b', ' ', chunk, flags=re.IGNORECASE)
        cleaned = re.sub(r'\d+(?:\.\d+)?\s*(?:g|gm|gram|grams)?\b', ' ', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        if cleaned:
            segments.append({"name": cleaned, "grams": grams})
    if not segments:
        return []
    if total_grams and total_grams > 0:
        known = sum(s["grams"] for s in segments if s["grams"])
        unknown = [s for s in segments if not s["grams"]]
        remaining = max(0.0, total_grams - known)
        if unknown:
            each = remaining / len(unknown) if remaining > 0 else total_grams / len(segments)
            for seg in unknown:
                seg["grams"] = each
    for seg in segments:
        if not seg["grams"] or seg["grams"] <= 0:
            seg["grams"] = 100.0
    return segments


def fallback_photo_from_manual(manual_name, manual_grams):
    if not manual_name:
        return None
    total_grams = manual_grams or extract_quantity_from_text(manual_name) or 100.0
    segments = parse_manual_food_segments(manual_name, total_grams=total_grams)
    if not segments:
        return None
    total = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fats": 0.0}
    resolved_names = []
    used_usda = False
    for seg in segments:
        seg_name = seg["name"]
        seg_grams = float(seg.get("grams", 100.0))
        matched_key, score = fuzzy_match(seg_name)
        if matched_key and score >= 0.2:
            nd = NUTRITION_DB[matched_key]
            resolved_names.append(matched_key.title())
            total["calories"] += scale(nd["calories"], seg_grams)
            total["protein"] += scale(nd["protein"], seg_grams)
            total["carbs"] += scale(nd["carbs"], seg_grams)
            total["fats"] += scale(nd["fats"], seg_grams)
            continue
        usda = query_usda(seg_name)
        if not usda:
            continue
        used_usda = True
        resolved_names.append(usda["name"].title())
        total["calories"] += scale(usda["calories"], seg_grams)
        total["protein"] += scale(usda["protein"], seg_grams)
        total["carbs"] += scale(usda["carbs"], seg_grams)
        total["fats"] += scale(usda["fats"], seg_grams)
    if not resolved_names:
        return None
    quantity_g = sum(float(seg.get("grams", 0)) for seg in segments)
    source = "manual+usda" if used_usda else "manual+localdb"
    return {
        "status": "ok",
        "food_name": " + ".join(resolved_names[:4]),
        "quantity_g": round(quantity_g, 1),
        "nutrition": {k: round(v, 1) for k, v in total.items()},
        "source": source,
    }


def analyze_photo(image_url, manual_name="", manual_grams=None):
    """
    Two-step Groq-only pipeline:
      Step 1: Groq Vision identifies food from image
      Step 2: Groq Text calculates macros
      Fallback: Local DB / USDA
    Returns dict with status, food_name, quantity_g, nutrition, source.
    """
    client = _get_groq_client()
    if not client:
        fb = fallback_photo_from_manual(manual_name, manual_grams)
        if fb:
            fb["note"] = "AI key missing: estimated from manual description."
            return fb
        return {"status": "error", "message": "GROQ_API_KEY not configured."}

    # Step 1: Groq Vision
    if manual_name:
        vision_prompt = (
            f'Look at this food photo. The user says it contains: "{manual_name}". '
            f'Use that as your primary food identification. '
            f'Estimate the total weight in grams as served'
            + (f' (user estimates ~{manual_grams}g).' if manual_grams else '.') +
            ' Respond ONLY with a JSON object — no markdown, no extra text — '
            'using exactly these keys: '
            '{"food_name": "name of the food", "quantity_g": 150, '
            '"description": "brief description of what you see"}'
        )
    else:
        vision_prompt = (
            'Look at this food photo and identify all major visible food components. '
            'Estimate total meal weight in grams as served. '
            'Respond ONLY with a JSON object — no markdown, no extra text — '
            'using exactly these keys: '
            '{"food_name": "name of the food", "quantity_g": 150, '
            '"description": "brief description of what you see"}'
        )

    try:
        groq_response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": vision_prompt},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }],
            max_tokens=200, temperature=0.1,
        )
    except Exception as groq_err:
        err_str = str(groq_err)
        if "429" in err_str or "rate" in err_str.lower():
            return {"status": "error", "message": "Vision AI rate limited. Wait and retry.", "code": 429}
        raise

    groq_raw = groq_response.choices[0].message.content.strip()
    groq_raw = re.sub(r"```json|```", "", groq_raw).strip()
    logger.info(f"Groq Vision raw: {groq_raw[:200]}")

    try:
        groq_data = json.loads(groq_raw)
    except json.JSONDecodeError:
        m = re.search(r'\{[^}]+\}', groq_raw, re.DOTALL)
        if m:
            groq_data = json.loads(m.group())
        else:
            return {"status": "error", "message": "Vision AI couldn't parse the image."}

    food_name = str(groq_data.get("food_name", "")).strip()
    quantity_g = float(groq_data.get("quantity_g", 100))
    description = str(groq_data.get("description", food_name))
    if manual_name:
        food_name = manual_name
    if manual_grams:
        quantity_g = manual_grams
    if not food_name:
        return {"status": "error", "message": "Could not identify food in the image."}

    logger.info(f"Step 1 → food: {food_name}, qty: {quantity_g}g")

    # Step 2: Groq Text — macros
    groq_macros = None
    macro_prompt = (
        f"You are a nutrition database. Give accurate nutritional values for:\n"
        f"Food: {food_name}\nServing size: {quantity_g}g\nDescription: {description}\n\n"
        f"Respond ONLY with a JSON object, no markdown, no extra text:\n"
        f'{{"calories": 250, "protein": 12.5, "carbs": 30.0, "fats": 8.5}}'
    )
    try:
        macro_resp = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": macro_prompt}],
            max_tokens=100, temperature=0.1,
        )
        macro_raw = macro_resp.choices[0].message.content.strip()
        macro_raw = re.sub(r"```json|```", "", macro_raw).strip()
        logger.info(f"Groq Macro raw: {macro_raw[:200]}")
        try:
            groq_macros = json.loads(macro_raw)
        except json.JSONDecodeError:
            m = re.search(r'\{[^}]+\}', macro_raw, re.DOTALL)
            if m:
                groq_macros = json.loads(m.group())
    except Exception as e:
        logger.warning(f"Groq macro step failed: {e}")

    if groq_macros and all(k in groq_macros for k in ("calories", "protein", "carbs", "fats")):
        return {
            "status": "ok",
            "food_name": food_name.title(),
            "quantity_g": round(quantity_g, 1),
            "nutrition": {k: round(float(groq_macros[k]), 1) for k in ("calories", "protein", "carbs", "fats")},
            "source": "groq+groq",
        }

    # Fallback: Local DB / USDA
    matched_key, score = fuzzy_match(food_name)
    if (not matched_key or score < 0.2) and food_name:
        usda = query_usda(food_name)
        if usda:
            return {
                "status": "ok",
                "food_name": usda["name"].title(),
                "quantity_g": round(quantity_g, 1),
                "nutrition": {
                    "calories": scale(usda["calories"], quantity_g),
                    "protein": scale(usda["protein"], quantity_g),
                    "carbs": scale(usda["carbs"], quantity_g),
                    "fats": scale(usda["fats"], quantity_g),
                },
                "source": "groq+usda",
            }
    if not matched_key or score < 0.2:
        return {"status": "not_found", "message": f"AI identified '{food_name}' but couldn't calculate macros."}
    nd = NUTRITION_DB[matched_key]
    return {
        "status": "ok",
        "food_name": matched_key.title(),
        "quantity_g": round(quantity_g, 1),
        "nutrition": {
            "calories": scale(nd["calories"], quantity_g),
            "protein": scale(nd["protein"], quantity_g),
            "carbs": scale(nd["carbs"], quantity_g),
            "fats": scale(nd["fats"], quantity_g),
        },
        "source": "groq+localdb",
    }
