from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from database.models import Message, Session as DBSession

def get_messages_by_session_id(db: Session, session_id: UUID) -> List[Message]:
    return db.query(Message).filter(Message.session_id == session_id).order_by(Message.created_at).all()

def get_message_by_id(db: Session, message_id: UUID) -> Optional[Message]:
    return db.query(Message).filter(Message.id == message_id).first()

def create_message(db: Session, session_id: UUID, role: str, content: str, source_citations: dict) -> Message:
    db_message = Message(
        session_id=session_id,
        role=role,
        content=content,
        source_citations=source_citations
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def delete_message(db: Session, message_id: UUID) -> bool:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        return False
    
    db.delete(message)
    db.commit()
    return True