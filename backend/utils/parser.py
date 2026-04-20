# =============================================================================
# NutriPulse — Input Parser
# =============================================================================
import re

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


def parse_smart_input(raw_input):
    """Parse natural language food input into (food_name, quantity_grams)."""
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
