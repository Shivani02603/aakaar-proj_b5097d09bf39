from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional
import pandas as pd
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import os
from .ingest import chunk_dataframe
from .rag import answer_question

router = APIRouter(prefix='/api/ai')

# Pydantic Models
class IngestRequest(BaseModel):
    session_id: str = Field(..., description="ID of the chat session")
    user_id: str = Field(..., description="ID of the user")

class IngestResponse(BaseModel):
    message: str = Field(..., description="Status message")
    file_id: str = Field(..., description="Unique ID of the uploaded file")
    chunks_created: int = Field(..., description="Number of chunks created")

class QueryRequest(BaseModel):
    session_id: str = Field(..., description="ID of the chat session")
    user_id: str = Field(..., description="ID of the user")
    question: str = Field(..., description="Natural language question")
    top_k: Optional[int] = Field(default=5, description="Number of chunks to retrieve")

class SourceCitation(BaseModel):
    file_name: str = Field(..., description="Name of the source file")
    sheet_name: str = Field(..., description="Name of the Excel sheet")
    start_row: int = Field(..., description="Starting row of the chunk")
    end_row: int = Field(..., description="Ending row of the chunk")
    content_preview: str = Field(..., description="Preview of the chunk content")

class QueryResponse(BaseModel):
    answer: str = Field(..., description="Generated answer")
    sources: List[SourceCitation] = Field(..., description="List of source citations")
    retrieved_chunks: int = Field(..., description="Number of chunks retrieved")

@router.post("/ingest", response_model=IngestResponse)
async def ingest(
    session_id: str,
    user_id: str,
    file: UploadFile = File(...)
):
    """
    Endpoint to upload and ingest an Excel file.
    """
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
    
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Save to temporary file for pandas processing
        temp_path = f"/tmp/{uuid.uuid4()}.xlsx"
        with open(temp_path, 'wb') as f:
            f.write(contents)
        
        # Process the file
        file_id, chunks_count = chunk_dataframe(
            file_path=temp_path,
            original_filename=file.filename,
            session_id=session_id,
            user_id=user_id
        )
        
        # Clean up temp file
        os.remove(temp_path)
        
        return IngestResponse(
            message="File ingested successfully",
            file_id=file_id,
            chunks_created=chunks_count
        )
    
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="The Excel file is empty")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.post("/query", response_model=QueryResponse)
async def query(
    request: QueryRequest
):
    """
    Endpoint to ask a question about ingested data.
    """
    try:
        answer, sources = answer_question(
            session_id=request.session_id,
            user_id=request.user_id,
            question=request.question,
            top_k=request.top_k
        )
        
        # Convert sources to Pydantic models
        source_citations = []
        for source in sources:
            source_citations.append(SourceCitation(
                file_name=source.get('file_name', 'Unknown'),
                sheet_name=source.get('sheet_name', 'Unknown'),
                start_row=source.get('start_row', 0),
                end_row=source.get('end_row', 0),
                content_preview=source.get('content_preview', '')[:100] + '...' if len(source.get('content_preview', '')) > 100 else source.get('content_preview', '')
            ))
        
        return QueryResponse(
            answer=answer,
            sources=source_citations,
            retrieved_chunks=len(sources)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")