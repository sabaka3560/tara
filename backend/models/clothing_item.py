"""SQLAlchemy async ORM model for the clothing_items table."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import ARRAY, Date, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

try:
    from pgvector.sqlalchemy import Vector

    _VECTOR_AVAILABLE = True
except ImportError:
    # pgvector not installed — embedding column omitted; classifier handles its own upsert
    _VECTOR_AVAILABLE = False

EMBEDDING_DIMENSIONS = 768
STATUS_DEFAULT = "processing"
WEAR_COUNT_DEFAULT = 0


class Base(DeclarativeBase):
    pass


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    blurhash: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_DEFAULT)
    type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    colors: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    pattern: Mapped[str | None] = mapped_column(Text, nullable=True)
    fabric_guess: Mapped[str | None] = mapped_column(Text, nullable=True)
    occasion: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    season: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    style: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fit: Mapped[str | None] = mapped_column(Text, nullable=True)
    care_guess: Mapped[str | None] = mapped_column(Text, nullable=True)
    wear_count: Mapped[int] = mapped_column(Integer, nullable=False, default=WEAR_COUNT_DEFAULT)
    last_worn: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


if _VECTOR_AVAILABLE:
    ClothingItem.embedding = mapped_column(Vector(EMBEDDING_DIMENSIONS), nullable=True)
