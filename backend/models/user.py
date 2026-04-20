# =============================================================================
# NutriPulse — User Model
# =============================================================================
from datetime import datetime, timezone
from backend.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    google_sub = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), default="User")
    picture = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    food_logs = db.relationship("FoodLog", backref="user", lazy="dynamic")
    water_logs = db.relationship("WaterLog", backref="user", lazy="dynamic")
    profile = db.relationship(
        "UserProfile", backref="user", uselist=False, lazy="joined"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "picture": self.picture,
            "sub": self.google_sub,
        }

    def __repr__(self):
        return f"<User {self.email}>"
