# =============================================================================
# NutriPulse — User Profile Model
# =============================================================================
from backend.extensions import db


class UserProfile(db.Model):
    __tablename__ = "user_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False
    )
    gender = db.Column(db.String(10), default="male")
    age = db.Column(db.Integer, default=25)
    height_cm = db.Column(db.Float, default=175.0)
    weight_kg = db.Column(db.Float, default=70.0)
    activity = db.Column(db.String(20), default="moderate")
    goal = db.Column(db.String(20), default="maintain")
    custom_calories = db.Column(db.Integer, nullable=True)

    def to_dict(self):
        return {
            "gender": self.gender,
            "age": self.age,
            "height_cm": self.height_cm,
            "weight_kg": self.weight_kg,
            "activity": self.activity,
            "goal": self.goal,
            "custom_calories": self.custom_calories,
        }

    def __repr__(self):
        return f"<UserProfile user_id={self.user_id}>"
