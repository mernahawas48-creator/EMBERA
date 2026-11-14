import os
from datetime import date
from functools import lru_cache

from dotenv import load_dotenv
from sqlalchemy import Date, Float, Index, Integer, JSON, String, UniqueConstraint, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

load_dotenv()


class Base(DeclarativeBase):
    pass


class Observation(Base):
    __tablename__ = "observations"
    id: Mapped[int] = mapped_column(primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True)
    day: Mapped[date] = mapped_column(Date)
    utc: Mapped[str] = mapped_column(String(17))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    x: Mapped[int] = mapped_column(Integer)
    y: Mapped[int] = mapped_column(Integer)
    sensor: Mapped[str] = mapped_column(String(5))
    platform: Mapped[str] = mapped_column(String(16))
    source: Mapped[str] = mapped_column(String(255))
    raw: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (Index("ix_observations_day_lat_lon", "day", "latitude", "longitude"),)


class Coverage(Base):
    __tablename__ = "coverage"
    id: Mapped[int] = mapped_column(primary_key=True)
    region: Mapped[str] = mapped_column(String(32))
    platform: Mapped[str] = mapped_column(String(16))
    start: Mapped[date] = mapped_column(Date)
    end: Mapped[date] = mapped_column(Date)
    source: Mapped[str] = mapped_column(String(255))
    __table_args__ = (UniqueConstraint("region", "platform", "start", "end", "source"),)


def database_url(demo=False):
    if demo:
        return os.getenv("DEMO_DATABASE_URL", "sqlite:///./embera-demo.db")
    return os.getenv("DATABASE_URL", "sqlite:///./embera-challenge.db")


@lru_cache(maxsize=8)
def engine_for(url):
    return create_engine(url, pool_pre_ping=True)
