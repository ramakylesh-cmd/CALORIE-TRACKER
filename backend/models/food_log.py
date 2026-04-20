# =============================================================================
# NutriPulse — Food Log Model
# =============================================================================
import uuid
from datetime import date, datetime, timezone
from backend.extensions import db


class FoodLog(db.Model):
    __tablename__ = "food_logs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    food_name = db.Column(db.String(150), nullable=False)
    quantity_g = db.Column(db.Float, nullable=False)
    calories = db.Column(db.Float, default=0.0)
    protein = db.Column(db.Float, default=0.0)
    carbs = db.Column(db.Float, default=0.0)
    fats = db.Column(db.Float, default=0.0)
    matched_score = db.Column(db.Float, default=1.0)
    source = db.Column(db.String(30), default="manual")  # manual, ai, barcode
    date = db.Column(db.Date, default=date.today, index=True)
    logged_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "food_name": self.food_name,
            "quantity_g": round(self.quantity_g, 1),
            "calories": round(self.calories, 1),
            "protein": round(self.protein, 1),
            "carbs": round(self.carbs, 1),
            "fats": round(self.fats, 1),
            "matched_score": round(self.matched_score, 2),
            "source": self.source,
        }

    def __repr__(self):
        return f"<FoodLog {self.food_name} {self.quantity_g}g>"
