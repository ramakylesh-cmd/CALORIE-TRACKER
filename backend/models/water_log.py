# =============================================================================
# NutriPulse — Water Log Model
# =============================================================================
from datetime import date, datetime, timezone
from backend.extensions import db


class WaterLog(db.Model):
    __tablename__ = "water_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    amount_ml = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, default=date.today, index=True)
    logged_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<WaterLog {self.amount_ml}ml>"
