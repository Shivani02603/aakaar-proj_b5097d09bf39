import os
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import Json
import numpy as np

class VectorStore:
    """PostgreSQL pgvector store for embeddings."""
    
    def __init__(self):
        self._connection = None
        self.dimension = 1536
    
    def _get_connection(self):
        """Lazily establish database connection."""
        if self._connection is None:
            db_host = os.getenv("DB_HOST", "localhost")
            db_port = os.getenv("DB_PORT", "5432")
            db_name = os.getenv("DB_NAME", "ragdb")
            db_user = os.getenv("DB_USER", "postgres")
            db_password = os.getenv("DB_PASSWORD", "")
            
            conn_string = f"host={db_host} port={db_port} dbname={db_name} user={db_user} password={db_password}"
            self._connection = psycopg2.connect(conn_string)
            
            # Enable pgvector extension
            with self._connection.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
                self._connection.commit()
            
            # Ensure embeddings table exists
            self._ensure_table()
        
        return self._connection
    
    def _ensure_table(self):
        """Create the embeddings table if it doesn't exist."""
        conn = self._get_connection()
        with conn.cursor() as cur:
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    embedding vector({self.dimension}),
                    metadata JSONB,
                    content TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create index for vector similarity search
            cur.execute("""
                CREATE INDEX IF NOT EXISTS embedding_idx 
                ON document_chunks 
                USING ivfflat (embedding vector_cosine_ops)
            """)
            
            conn.commit()
    
    def upsert(self, id: str, vector: List[float], metadata: Dict[str, Any], content: str):
        """
        Insert or update a vector with metadata.
        
        Args:
            id: Unique identifier for the chunk
            vector: Embedding vector (list of floats)
            metadata: Dictionary with metadata (filename, sheet, row_range, etc.)
            content: The actual text content of the chunk
        """
        conn = self._get_connection()
        with conn.cursor() as cur:
            # Convert vector to PostgreSQL vector format
            vector_array = np.array(vector, dtype=np.float32)
            
            cur.execute("""
                INSERT INTO document_chunks (id, embedding, metadata, content)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) 
                DO UPDATE SET 
                    embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata,
                    content = EXCLUDED.content
            """, (id, vector_array.tobytes(), Json(metadata), content))
            
            conn.commit()
    
    def search(self, query_embedding: List[float], top_k: int = 5, **filters) -> List[Dict[str, Any]]:
        """
        Search for similar vectors using cosine similarity.
        
        Args:
            query_embedding: The query embedding vector
            top_k: Number of results to return
            **filters: Optional metadata filters (e.g., filename='data.xlsx')
        
        Returns:
            List of dictionaries with id, content, metadata, and similarity score
        """
        conn = self._get_connection()
        
        # Build WHERE clause for metadata filters
        where_clauses = []
        params = []
        
        for key, value in filters.items():
            where_clauses.append(f"metadata->>%s = %s")
            params.extend([key, str(value)])
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Convert query embedding to PostgreSQL vector format
        query_array = np.array(query_embedding, dtype=np.float32)
        
        # SQL query for cosine similarity search
        sql = f"""
            SELECT 
                id,
                content,
                metadata,
                1 - (embedding <=> %s) as similarity
            FROM document_chunks
            WHERE {where_sql}
            ORDER BY embedding <=> %s
            LIMIT %s
        """
        
        params = [query_array.tobytes(), query_array.tobytes(), top_k] + params
        
        with conn.cursor() as cur:
            cur.execute(sql, params)
            results = cur.fetchall()
        
        matches = []
        for row in results:
            matches.append({
                "id": row[0],
                "content": row[1],
                "metadata": row[2],
                "similarity": float(row[3])
            })
        
        return matches
    
    def close(self):
        """Close the database connection."""
        if self._connection:
            self._connection.close()
            self._connection = None