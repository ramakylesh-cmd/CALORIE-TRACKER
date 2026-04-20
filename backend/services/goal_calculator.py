# =============================================================================
# NutriPulse — Goal Calculator Service
# =============================================================================
# Mifflin-St Jeor BMR → TDEE → macro targets.
# Extracted from original app.py _calc_goals().
# =============================================================================


def calc_goals(profile):
    """
    Calculate daily nutrition goals from user profile.

    Args:
        profile: dict with gender, age, height_cm, weight_kg, activity, goal,
                 optional custom_calories.

    Returns:
        dict with bmr, tdee, calories, protein, carbs, fats goals.
    """
    gender = profile.get("gender", "male")
    age = float(profile.get("age", 25))
    h = float(profile.get("height_cm", 175))
    w = float(profile.get("weight_kg", 70))

    # Mifflin-St Jeor equation
    if gender == "female":
        bmr = 10 * w + 6.25 * h - 5 * age - 161
    else:
        bmr = 10 * w + 6.25 * h - 5 * age + 5

    multipliers = {
        "sedentary": 1.2, "light": 1.375, "moderate": 1.55,
        "active": 1.725, "very_active": 1.9,
    }
    tdee = bmr * multipliers.get(profile.get("activity", "moderate"), 1.55)

    goal = profile.get("goal", "maintain")
    if goal == "lose":
        cal_goal = tdee - 500
    elif goal == "gain":
        cal_goal = tdee + 300
    else:
        cal_goal = tdee

    # Manual override — user knows their body better than the formula
    if profile.get("custom_calories"):
        cal_goal = int(profile["custom_calories"])
    else:
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
