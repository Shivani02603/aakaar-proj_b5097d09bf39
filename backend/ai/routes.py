from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime
import os
import json
import PyPDF2
from docx import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
import openai
from openai import OpenAI
import numpy as np

from database.config import get_db
from database.models import UploadedFile, DocumentChunk, Session as DBSession, Message

router = APIRouter(prefix="/api/ai", tags=["AI"])

# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable not set")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

EMBEDDING_MODEL = "text-embedding-3-small"
LLM_MODEL = "gpt-4"

class IngestRequest(BaseModel):
    uploaded_file_id: UUID

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    session_id: UUID
    conversation_id: Optional[UUID] = None
    top_k: int = Field(5, ge=1, le=20)

class QueryResponse(BaseModel):
    response: str
    conversation_id: UUID
    source_citations: List[Dict[str, Any]]

class EmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1)

class EmbeddingResponse(BaseModel):
    embedding: List[float]

def extract_text_from_file(file_path: str, filename: str) -> str:
    if filename.lower().endswith('.pdf'):
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return text
    elif filename.lower().endswith('.docx'):
        doc = Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    elif filename.lower().endswith('.txt'):
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    else:
        raise ValueError(f"Unsupported file type: {filename}")

def chunk_text(text: str) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    return splitter.split_text(text)

def embed_text(text: str) -> List[float]:
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding

def similarity_search(query_embedding: List[float], top_k: int, db: Session) -> List[DocumentChunk]:
    query_embedding_array = np.array(query_embedding)
    
    chunks = db.query(DocumentChunk).all()
    results = []
    
    for chunk in chunks:
        if chunk.embedding:
            chunk_embedding = np.array(chunk.embedding)
            similarity = np.dot(query_embedding_array, chunk_embedding) / (
                np.linalg.norm(query_embedding_array) * np.linalg.norm(chunk_embedding)
            )
            results.append((similarity, chunk))
    
    results.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in results[:top_k]]

def build_rag_context(chunks: List[DocumentChunk]) -> str:
    context = ""
    for i, chunk in enumerate(chunks):
        context += f"Document chunk {i+1} (from file: {chunk.uploaded_file.filename}, rows {chunk.row_start}-{chunk.row_end}):\n"
        context += chunk.content + "\n\n"
    return context

def call_llm(messages: List[Dict[str, str]], stream: bool = False):
    if stream:
        response = openai_client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            stream=True
        )
        return response
    else:
        response = openai_client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages
        )
        return response.choices[0].message.content

@router.post("/ingest", status_code=status.HTTP_200_OK)
async def ingest_documents(
    request: IngestRequest,
    db: Session = Depends(get_db)
):
    uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == request.uploaded_file_id).first()
    if not uploaded_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file not found"
        )
    
    file_path = Path("uploads") / uploaded_file.filename
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    try:
        text = extract_text_from_file(str(file_path), uploaded_file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to extract text from file: {str(e)}"
        )
    
    chunks = chunk_text(text)
    
    for i, chunk_text_content in enumerate(chunks):
        embedding = embed_text(chunk_text_content)
        
        db_chunk = DocumentChunk(
            uploaded_file_id=uploaded_file.id,
            chunk_index=i,
            content=chunk_text_content,
            row_start=i * 1000,
            row_end=i * 1000 + len(chunk_text_content),
            embedding=embedding
        )
        db.add(db_chunk)
    
    db.commit()
    
    return {"message": f"Successfully ingested {len(chunks)} chunks from {uploaded_file.filename}"}

@router.post("/query", response_model=QueryResponse)
async def ai_query(
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    session = db.query(DBSession).filter(DBSession.id == request.session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    query_embedding = embed_text(request.query)
    relevant_chunks = similarity_search(query_embedding, request.top_k, db)
    
    context = build_rag_context(relevant_chunks)
    
    conversation_id = request.conversation_id or UUID(int=0)
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context. Always cite your sources using the document chunk numbers."},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {request.query}"}
    ]
    
    response_text = call_llm(messages, stream=False)
    
    user_message = Message(
        session_id=request.session_id,
        role="user",
        content=request.query,
        source_citations={}
    )
    db.add(user_message)
    
    assistant_message = Message(
        session_id=request.session_id,
        role="assistant",
        content=response_text,
        source_citations={
            "chunks": [
                {
                    "chunk_id": str(chunk.id),
                    "file_id": str(chunk.uploaded_file_id),
                    "filename": chunk.uploaded_file.filename,
                    "chunk_index": chunk.chunk_index,
                    "row_start": chunk.row_start,
                    "row_end": chunk.row_end
                }
                for chunk in relevant_chunks
            ]
        }
    )
    db.add(assistant_message)
    db.commit()
    
    return QueryResponse(
        response=response_text,
        conversation_id=conversation_id,
        source_citations=[
            {
                "chunk_id": str(chunk.id),
                "file_id": str(chunk.uploaded_file_id),
                "filename": chunk.uploaded_file.filename,
                "chunk_index": chunk.chunk_index,
                "row_start": chunk.row_start,
                "row_end": chunk.row_end
            }
            for chunk in relevant_chunks
        ]
    )

@router.post("/embed", response_model=EmbeddingResponse)
async def generate_embedding(
    request: EmbeddingRequest,
    db: Session = Depends(get_db)
):
    embedding = embed_text(request.text)
    return EmbeddingResponse(embedding=embedding)

@router.post("/query/stream")
async def ai_query_stream(
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    session = db.query(DBSession).filter(DBSession.id == request.session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    query_embedding = embed_text(request.query)
    relevant_chunks = similarity_search(query_embedding, request.top_k, db)
    
    context = build_rag_context(relevant_chunks)
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context. Always cite your sources using the document chunk numbers."},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {request.query}"}
    ]
    
    async def stream_generator():
        stream = call_llm(messages, stream=True)
        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                yield f"data: {json.dumps({'token': content})}\n\n"
        
        user_message = Message(
            session_id=request.session_id,
            role="user",
            content=request.query,
            source_citations={}
        )
        db.add(user_message)
        
        assistant_message = Message(
            session_id=request.session_id,
            role="assistant",
            content=full_response,
            source_citations={
                "chunks": [
                    {
                        "chunk_id": str(chunk.id),
                        "file_id": str(chunk.uploaded_file_id),
                        "filename": chunk.uploaded_file.filename,
                        "chunk_index": chunk.chunk_index,
                        "row_start": chunk.row_start,
                        "row_end": chunk.row_end
                    }
                    for chunk in relevant_chunks
                ]
            }
        )
        db.add(assistant_message)
        db.commit()
        
        yield f"data: {json.dumps({'done': True})}\n\n"
    
    return StreamingResponse(stream_generator(), media_type="text/event-stream")