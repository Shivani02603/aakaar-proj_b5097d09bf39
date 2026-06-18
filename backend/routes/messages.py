from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime

from database.config import get_db
from database.models import Message, Session as DBSession

router = APIRouter(prefix="/api/sessions/{session_id}/messages", tags=["Messages"])

class MessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    source_citations: dict
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[MessageResponse])
def get_messages(session_id: UUID, db: Session = Depends(get_db)):
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.created_at).all()
    return messages