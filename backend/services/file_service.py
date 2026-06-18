from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from pathlib import Path
import os
import shutil
from database.models import UploadedFile, Session as DBSession

UPLOAD_DIR = Path("uploads")

def save_uploaded_file(file_content: bytes, filename: str) -> str:
    UPLOAD_DIR.mkdir(exist_ok=True)
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    return str(file_path)

def get_file_size(file_path: str) -> int:
    return os.path.getsize(file_path)

def create_uploaded_file_record(db: Session, session_id: UUID, filename: str, file_size: int) -> UploadedFile:
    db_file = UploadedFile(
        session_id=session_id,
        filename=filename,
        file_size=file_size
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

def get_uploaded_file_by_id(db: Session, file_id: UUID) -> Optional[UploadedFile]:
    return db.query(UploadedFile).filter(UploadedFile.id == file_id).first()

def get_uploaded_files_by_session_id(db: Session, session_id: UUID) -> List[UploadedFile]:
    return db.query(UploadedFile).filter(UploadedFile.session_id == session_id).all()

def delete_uploaded_file(db: Session, file_id: UUID) -> bool:
    uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not uploaded_file:
        return False
    
    file_path = UPLOAD_DIR / uploaded_file.filename
    if file_path.exists():
        os.remove(file_path)
    
    db.delete(uploaded_file)
    db.commit()
    return True