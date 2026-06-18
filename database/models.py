import os
from datetime import datetime
from typing import Optional, List
from uuid import uuid4, UUID

from sqlalchemy import (
    create_engine,
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    JSON,
    Index,
    text
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
    Session
)
from sqlalchemy.sql import func
from pydantic import BaseModel

# Environment variable for database URL
DATABASE_URL_ENV = "DATABASE_URL"
DATABASE_URL = os.environ.get(DATABASE_URL_ENV)

if not DATABASE_URL:
    raise ValueError(f"Environment variable {DATABASE_URL_ENV} is not set")

# Create engine
engine = create_engine(DATABASE_URL, echo=False)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase, BaseModel):
    pass

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    sessions: Mapped[List["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username})>"

class Session(Base):
    __tablename__ = "sessions"
    
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    uploaded_files: Mapped[List["UploadedFile"]] = relationship("UploadedFile", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Session(id={self.id}, name={self.name}, user_id={self.user_id})>"

class Message(Base):
    __tablename__ = "messages"
    
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_citations: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    session: Mapped["Session"] = relationship("Session", back_populates="messages")
    
    __table_args__ = (
        Index("ix_messages_session_id_created_at", "session_id", "created_at"),
    )
    
    def __repr__(self):
        return f"<Message(id={self.id}, role={self.role}, session_id={self.session_id})>"

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    session: Mapped["Session"] = relationship("Session", back_populates="uploaded_files")
    document_chunks: Mapped[List["DocumentChunk"]] = relationship("DocumentChunk", back_populates="uploaded_file", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("ix_uploaded_files_session_id", "session_id"),
    )
    
    def __repr__(self):
        return f"<UploadedFile(id={self.id}, filename={self.filename}, session_id={self.session_id})>"

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    uploaded_file_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("uploaded_files.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    row_start: Mapped[int] = mapped_column(Integer, nullable=False)
    row_end: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[Optional[List[float]]] = mapped_column("embedding", nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    uploaded_file: Mapped["UploadedFile"] = relationship("UploadedFile", back_populates="document_chunks")
    
    __table_args__ = (
        Index("ix_document_chunks_uploaded_file_id", "uploaded_file_id"),
    )
    
    def __repr__(self):
        return f"<DocumentChunk(id={self.id}, chunk_index={self.chunk_index}, uploaded_file_id={self.uploaded_file_id})>"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()