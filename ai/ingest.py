import os
import pandas as pd
from typing import List, Dict, Any, Tuple
import uuid
from datetime import datetime
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
import tiktoken

from .embeddings import get_embedding
from .vector_store import VectorStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """
    Recursive chunking strategy using token count.
    """
    if not text or text.strip() == "":
        return []
    
    encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)
    
    if len(tokens) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunk_text = encoding.decode(chunk_tokens)
        chunks.append(chunk_text)
        start = end - chunk_overlap
    
    return chunks

def chunk_dataframe(df: pd.DataFrame, sheet_name: str) -> List[Dict[str, Any]]:
    """
    Convert DataFrame to text chunks with metadata.
    """
    chunks = []
    text_content = df.to_string(index=False)
    if not text_content or text_content.strip() == "":
        return chunks
    
    text_chunks = chunk_text(text_content, chunk_size=1000, chunk_overlap=200)
    
    for i, chunk in enumerate(text_chunks):
        chunk_metadata = {
            "chunk_index": i,
            "sheet_name": sheet_name,
            "total_chunks": len(text_chunks),
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns)
        }
        chunks.append({
            "text": chunk,
            "metadata": chunk_metadata
        })
    
    return chunks

def ingest_excel(file_path: str, session_id: str, user_id: str, db_session: Session) -> Dict[str, Any]:
    """
    Main ingestion function for Excel files.
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        file_name = os.path.basename(file_path)
        file_id = str(uuid.uuid4())
        
        logger.info(f"Ingesting Excel file: {file_name} for user {user_id}, session {session_id}")
        
        xls = pd.ExcelFile(file_path)
        all_chunks = []
        
        for sheet_name in xls.sheet_names:
            try:
                df = pd.read_excel(xls, sheet_name=sheet_name)
                df = df.where(pd.notnull(df), None)
                
                sheet_chunks = chunk_dataframe(df, sheet_name)
                
                for chunk_data in sheet_chunks:
                    chunk_data["metadata"]["file_id"] = file_id
                    chunk_data["metadata"]["file_name"] = file_name
                    chunk_data["metadata"]["session_id"] = session_id
                    chunk_data["metadata"]["user_id"] = user_id
                    chunk_data["metadata"]["sheet_name"] = sheet_name
                    chunk_data["metadata"]["ingested_at"] = datetime.utcnow().isoformat()
                
                all_chunks.extend(sheet_chunks)
                logger.info(f"Processed sheet '{sheet_name}': {len(sheet_chunks)} chunks")
                
            except Exception as e:
                logger.error(f"Error processing sheet '{sheet_name}': {str(e)}")
                continue
        
        if not all_chunks:
            raise ValueError("No valid data found in the Excel file")
        
        logger.info(f"Total chunks generated: {len(all_chunks)}")
        
        vector_store = VectorStore(db_session)
        
        for chunk_data in all_chunks:
            try:
                text = chunk_data["text"]
                metadata = chunk_data["metadata"]
                
                embedding = get_embedding(text)
                
                vector_store.upsert(
                    text=text,
                    embedding=embedding,
                    metadata=metadata,
                    session_id=session_id,
                    user_id=user_id
                )
                
            except Exception as e:
                logger.error(f"Error embedding/upserting chunk: {str(e)}")
                continue
        
        file_record = {
            "file_id": file_id,
            "file_name": file_name,
            "user_id": user_id,
            "session_id": session_id,
            "total_chunks": len(all_chunks),
            "ingested_at": datetime.utcnow(),
            "file_path": file_path
        }
        
        try:
            db_session.execute(
                text("""
                INSERT INTO uploaded_files 
                (id, filename, user_id, session_id, total_chunks, ingested_at, file_path)
                VALUES (:file_id, :file_name, :user_id, :session_id, :total_chunks, :ingested_at, :file_path)
                """),
                file_record
            )
            db_session.commit()
        except Exception as e:
            logger.error(f"Error saving file record: {str(e)}")
            db_session.rollback()
        
        logger.info(f"Successfully ingested {file_name} with {len(all_chunks)} chunks")
        
        return {
            "success": True,
            "file_id": file_id,
            "file_name": file_name,
            "total_chunks": len(all_chunks),
            "sheets_processed": len(xls.sheet_names)
        }
        
    except Exception as e:
        logger.error(f"Error ingesting Excel file: {str(e)}")
        db_session.rollback()
        return {
            "success": False,
            "error": str(e),
            "file_name": os.path.basename(file_path) if 'file_path' in locals() else "unknown"
        }