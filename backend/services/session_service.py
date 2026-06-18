from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from database.models import Session as DBSession, User

def get_session_by_id(db: Session, session_id: UUID) -> Optional[DBSession]:
    return db.query(DBSession).filter(DBSession.id == session_id).first()

def get_sessions_by_user_id(db: Session, user_id: UUID) -> List[DBSession]:
    return db.query(DBSession).filter(DBSession.user_id == user_id).all()

def create_session(db: Session, user_id: UUID, name: str) -> DBSession:
    db_session = DBSession(user_id=user_id, name=name)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def update_session_name(db: Session, session_id: UUID, name: str) -> Optional[DBSession]:
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        return None
    
    session.name = name
    db.commit()
    db.refresh(session)
    return session

def delete_session(db: Session, session_id: UUID) -> bool:
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        return False
    
    db.delete(session)
    db.commit()
    return True