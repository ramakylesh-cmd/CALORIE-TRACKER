# =============================================================================
# NutriPulse — Nutrition Database Service
# =============================================================================
# Local nutrition data (per 100g), fuzzy matching, aliases, barcode lookup.
# Extracted from the original monolithic app.py for clean separation.
# =============================================================================


# ── NUTRITION DATABASE (per 100g) ─────────────────────────────────────────────
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
    # Indian foods
    "dosa":               {"calories": 168, "protein": 3.9,  "carbs": 30.0, "fats": 3.7},
    "idli":               {"calories": 58,  "protein": 2.0,  "carbs": 11.0, "fats": 0.4},
    "sambar":             {"calories": 55,  "protein": 3.0,  "carbs": 8.0,  "fats": 1.5},
    "chutney":            {"calories": 80,  "protein": 2.0,  "carbs": 8.0,  "fats": 4.5},
    "rice":               {"calories": 130, "protein": 2.7,  "carbs": 28.0, "fats": 0.3},
    "dal":                {"calories": 116, "protein": 9.0,  "carbs": 20.0, "fats": 0.4},
    "roti":               {"calories": 297, "protein": 9.0,  "carbs": 56.0, "fats": 3.7},
    "chapati":            {"calories": 297, "protein": 9.0,  "carbs": 56.0, "fats": 3.7},
    "biryani":            {"calories": 163, "protein": 5.5,  "carbs": 25.0, "fats": 5.0},
    "paneer":             {"calories": 265, "protein": 18.0, "carbs": 3.4,  "fats": 20.0},
    "palak paneer":       {"calories": 137, "protein": 7.5,  "carbs": 5.0,  "fats": 10.0},
    "butter chicken":     {"calories": 150, "protein": 12.0, "carbs": 6.0,  "fats": 9.0},
    "naan":               {"calories": 310, "protein": 9.0,  "carbs": 55.0, "fats": 6.0},
    "upma":               {"calories": 145, "protein": 3.5,  "carbs": 22.0, "fats": 5.0},
    "poha":               {"calories": 130, "protein": 2.5,  "carbs": 27.0, "fats": 2.0},
    "vada":               {"calories": 290, "protein": 8.0,  "carbs": 35.0, "fats": 14.0},
    "uttapam":            {"calories": 145, "protein": 4.5,  "carbs": 26.0, "fats": 3.0},
    "pongal":             {"calories": 150, "protein": 4.0,  "carbs": 25.0, "fats": 4.5},
    "rasam":              {"calories": 30,  "protein": 1.5,  "carbs": 5.0,  "fats": 0.5},
    "curd rice":          {"calories": 120, "protein": 3.5,  "carbs": 22.0, "fats": 2.0},
    "masala dosa":        {"calories": 210, "protein": 5.0,  "carbs": 35.0, "fats": 6.5},
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
    "dosai": "dosa", "thosai": "dosa", "idly": "idli", "sambhar": "sambar",
}

BARCODE_DB = {
    "016000275287": {"name": "cheerios",          "food": "oats",             "quantity_g": 100},
    "038000845581": {"name": "special k cereal",  "food": "oats",             "quantity_g": 100},
    "021130126026": {"name": "salmon fillet",     "food": "salmon",           "quantity_g": 100},
    "070470003218": {"name": "peanut butter jar", "food": "peanut butter",    "quantity_g": 100},
    "036800397965": {"name": "greek yogurt cup",  "food": "greek yogurt",     "quantity_g": 150},
    "041303011157": {"name": "whole wheat bread", "food": "whole wheat bread", "quantity_g": 100},
    "011110038364": {"name": "brown rice bag",    "food": "brown rice",       "quantity_g": 100},
}

PHOTO_FOOD_KEYWORDS = {
    "pizza": "pizza", "burger": "burger", "salad": "spinach", "chicken": "chicken breast",
    "rice": "white rice", "pasta": "pasta", "egg": "egg", "banana": "banana",
    "apple": "apple", "sandwich": "whole wheat bread", "soup": "tomato",
    "steak": "beef (lean)", "fish": "salmon", "broccoli": "broccoli",
    "avocado": "avocado", "oatmeal": "oats", "yogurt": "greek yogurt",
    "chocolate": "dark chocolate", "nuts": "almonds", "fries": "french fries",
    "sushi": "tuna", "toast": "whole wheat bread", "smoothie": "banana",
    "dosa": "dosa", "idli": "idli", "sambar": "sambar", "roti": "roti",
    "biryani": "biryani", "paneer": "paneer", "naan": "naan",
}


# ── Helper: scale nutrition values from per-100g to actual quantity ────────────
def scale(nutrient_val, quantity_g):
    return round(nutrient_val * quantity_g / 100, 1)


# ── Multi-stage fuzzy food matching ───────────────────────────────────────────
def fuzzy_match(query):
    """
    Lookup chain: exact → alias → prefix → substring → word overlap → trigram.
    Returns (matched_key, confidence_score) or (None, 0.0).
    """
    query = query.lower().strip()

    # 1. Exact match
    if query in NUTRITION_DB:
        return query, 1.0

    # 2. Alias match
    if query in FOOD_ALIASES:
        alias = FOOD_ALIASES[query]
        if alias in NUTRITION_DB:
            return alias, 0.95

    # 3. Prefix match
    for key in NUTRITION_DB:
        if key.startswith(query) or query.startswith(key):
            return key, 0.9

    # 4. Substring match
    matches = [(k, len(k)) for k in NUTRITION_DB if query in k or k in query]
    if matches:
        best = min(matches, key=lambda x: abs(x[1] - len(query)))
        return best[0], 0.8

    # 5. Word overlap
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

    # 6. Trigram similarity
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


def get_suggestions(query):
    """Return up to 5 food suggestions based on partial query."""
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


def search_foods(query=""):
    """Search the local nutrition database for matching foods."""
    q = query.strip().lower()
    if not q:
        return list(NUTRITION_DB.keys())
    scored = []
    for key in NUTRITION_DB:
        if q in key:
            scored.append((key, 1.0))
        elif key.startswith(q[:3]):
            scored.append((key, 0.7))
        elif any(w.startswith(q) for w in key.split()):
            scored.append((key, 0.5))
    scored.sort(key=lambda x: -x[1])
    return [k for k, _ in scored[:15]]


def lookup_barcode(barcode):
    """Look up a barcode in the local barcode database."""
    if barcode not in BARCODE_DB:
        return None
    bc_entry = BARCODE_DB[barcode]
    food_key = bc_entry.get("food")
    if not food_key or food_key not in NUTRITION_DB:
        return None
    nd = NUTRITION_DB[food_key]
    qty = bc_entry.get("quantity_g", 100)
    return {
        "food_name": food_key,
        "quantity_g": qty,
        "preview": {
            "calories": scale(nd["calories"], qty),
            "protein": scale(nd["protein"], qty),
            "carbs": scale(nd["carbs"], qty),
            "fats": scale(nd["fats"], qty),
        },
    }
