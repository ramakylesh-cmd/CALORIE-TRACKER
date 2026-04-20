# =============================================================================
# NutriPulse — USDA FoodData Central Service
# =============================================================================
import os
import requests


def query_usda(query):
    """Query USDA FoodData Central API as fallback for unknown foods."""
    api_key = os.getenv("USDA_API_KEY") or "DEMO_KEY"
    try:
        resp = requests.get(
            "https://api.nal.usda.gov/fdc/v1/foods/search",
            params={
                "query": query, "api_key": api_key,
                "pageSize": 1, "dataType": "Foundation,SR Legacy,Survey (FNDDS)",
            },
            timeout=4,
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
            "protein": round(float(nut.get("Protein", 0)), 1),
            "carbs": round(float(nut.get("Carbohydrate, by difference", 0)), 1),
            "fats": round(float(nut.get("Total lipid (fat)", 0)), 1),
        }
    except Exception:
        return None
