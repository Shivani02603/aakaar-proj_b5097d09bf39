import os
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from datetime import datetime

from .embeddings import get_embedding
from .vector_store import VectorStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def retrieve_context(query: str, top_k: int = 5, session_id: Optional[str] = None, user_id: Optional[str] = None, db_session = None) -> List[Dict[str, Any]]:
    """
    Retrieve relevant context for a query.
    """
    try:
        if not query or query.strip() == "":
            return []
        
        query_embedding = get_embedding(query)
        
        vector_store = VectorStore(db_session)
        
        results = vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            session_id=session_id,
            user_id=user_id
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Error retrieving context: {str(e)}")
        return []

def build_prompt(query: str, context_chunks: List[Dict[str, Any]]) -> str:
    """
    Build prompt for Gemini with context and instructions.
    """
    if not context_chunks:
        return f"Question: {query}\n\nAnswer based on your general knowledge:"
    
    context_text = ""
    for i, chunk in enumerate(context_chunks):
        metadata = chunk.get("metadata", {})
        file_name = metadata.get("file_name", "Unknown file")
        sheet_name = metadata.get("sheet_name", "Unknown sheet")
        chunk_idx = metadata.get("chunk_index", i)
        total_chunks = metadata.get("total_chunks", 1)
        
        context_text += f"[Source {i+1}: {file_name} - Sheet: {sheet_name} (Chunk {chunk_idx+1}/{total_chunks})]\n"
        context_text += f"{chunk.get('text', '')}\n\n"
    
    prompt = f"""You are a helpful data analysis assistant. Use the provided context from Excel files to answer the question.

Context from uploaded Excel files:
{context_text}

Question: {query}

Instructions:
1. Answer the question based ONLY on the provided context.
2. If the context doesn't contain enough information to answer fully, say so and explain what information is missing.
3. Cite your sources using the format [Source X] where X corresponds to the source number above.
4. Be concise but thorough.
5. If the question requires calculations or data interpretation, provide them based on the context.

Answer:"""
    
    return prompt

def answer_question(query: str, session_id: str, user_id: str, db_session) -> Dict[str, Any]:
    """
    Main RAG function to answer questions.
    """
    try:
        if not query or query.strip() == "":
            return {
                "answer": "Please provide a question.",
                "sources": [],
                "success": False
            }
        
        logger.info(f"Answering question for user {user_id}, session {session_id}: {query[:100]}...")
        
        context_chunks = retrieve_context(
            query=query,
            top_k=5,
            session_id=session_id,
            user_id=user_id,
            db_session=db_session
        )
        
        prompt = build_prompt(query, context_chunks)
        
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        response = model.generate_content(prompt)
        
        answer = response.text.strip() if response.text else "No answer generated."
        
        sources = []
        for chunk in context_chunks:
            metadata = chunk.get("metadata", {})
            source_info = {
                "file_name": metadata.get("file_name", "Unknown"),
                "sheet_name": metadata.get("sheet_name", "Unknown"),
                "chunk_index": metadata.get("chunk_index", 0),
                "total_chunks": metadata.get("total_chunks", 1),
                "similarity_score": chunk.get("similarity_score", 0.0),
                "text_preview": chunk.get("text", "")[:200] + "..." if len(chunk.get("text", "")) > 200 else chunk.get("text", "")
            }
            sources.append(source_info)
        
        try:
            db_session.execute(
                "INSERT INTO messages (session_id, user_id, query, answer, created_at) VALUES (:session_id, :user_id, :query, :answer, :created_at)",
                {
                    "session_id": session_id,
                    "user_id": user_id,
                    "query": query,
                    "answer": answer,
                    "created_at": datetime.utcnow()
                }
            )
            db_session.commit()
        except Exception as e:
            logger.error(f"Error saving message to database: {str(e)}")
            db_session.rollback()
        
        result = {
            "answer": answer,
            "sources": sources,
            "success": True,
            "query": query,
            "context_count": len(context_chunks)
        }
        
        logger.info(f"Question answered successfully with {len(sources)} sources")
        return result
        
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        return {
            "answer": f"Error generating answer: {str(e)}",
            "sources": [],
            "success": False,
            "query": query
        }