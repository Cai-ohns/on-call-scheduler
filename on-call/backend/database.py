"""
Database setup and models for On-Call Scheduler
"""
from sqlalchemy import create_engine, Column, Integer, String, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import enum
import os

# Database file path
DATABASE_URL = "sqlite:///./staff.db"

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    echo=False  # Set to True for SQL query logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


class StaffRole(str, enum.Enum):
    """Staff role enumeration"""
    JUNIOR = "Junior"
    INTERMEDIATE = "Intermediate"
    SENIOR = "Senior"


class Staff(Base):
    """Staff model for database"""
    __tablename__ = "staff"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    role = Column(Enum(StaffRole), nullable=False)
    default_target_shifts = Column(Integer, nullable=False, default=7)
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role.value,
            "default_target_shifts": self.default_target_shifts
        }


# Create tables
def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


# Dependency to get database session
def get_db():
    """Dependency function to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

