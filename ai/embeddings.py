import os
from typing import List
import openai

class EmbeddingClient:
    """Client for OpenAI text-embedding-3-small embeddings."""
    
    def __init__(self):
        self.model = "text-embedding-3-small"
        self.dimension = 1536
        self._api_key = None
    
    def _get_api_key(self) -> str:
        """Lazily load API key from environment variable."""
        if self._api_key is None:
            self._api_key = os.getenv("OPENAI_API_KEY")
            if not self._api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")
        return self._api_key
    
    def embed_text(self, text: str) -> List[float]:
        """Embed a single text string."""
        return self.embed_batch([text])[0]
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of text strings."""
        api_key = self._get_api_key()
        
        client = openai.OpenAI(api_key=api_key)
        
        response = client.embeddings.create(
            model=self.model,
            input=texts,
            dimensions=self.dimension
        )
        
        embeddings = [data.embedding for data in response.data]
        return embeddings


def get_embedding(texts: List[str]) -> List[List[float]]:
    """
    Module-level function to get embeddings for a list of texts.
    Import as: from ai.embeddings import get_embedding
    """
    client = EmbeddingClient()
    return client.embed_batch(texts)