# =============================================================================
# NutriPulse — Insight Engine Service
# =============================================================================

def generate_insights(entries, goals):
    if not entries:
        return []
    total_cal = sum(e.get("calories", 0) for e in entries)
    total_protein = sum(e.get("protein", 0) for e in entries)
    total_carbs = sum(e.get("carbs", 0) for e in entries)
    total_fats = sum(e.get("fats", 0) for e in entries)
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
