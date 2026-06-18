from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime
import os
import shutil
from pathlib import Path

from database.config import get_db
from database.models import UploadedFile, Session as DBSession

router = APIRouter(prefix="/api/files", tags=["Files"])

class UploadedFileResponse(BaseModel):
    id: UUID
    session_id: UUID
    filename: str
    file_size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/upload", response_model=UploadedFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    session_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    file_location = UPLOAD_DIR / file.filename
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    file_size = os.path.getsize(file_location)
    
    db_file = UploadedFile(
        session_id=session_id,
        filename=file.filename,
        file_size=file_size
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    return db_file