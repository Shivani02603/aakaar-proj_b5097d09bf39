```typescript
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Base URL configuration
const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// TypeScript interfaces for API requests and responses

// Auth interfaces
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: number;
  username: string;
  created_at: string;
}

// User interfaces
export interface UserUpdateRequest {
  username?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  created_at: string;
}

// Session interfaces
export interface SessionCreateRequest {
  name: string;
}

export interface SessionResponse {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

// Message interfaces
export interface MessageResponse {
  id: number;
  session_id: number;
  role: 'user' | 'assistant';
  content: string;
  source_citations: string | null;
  created_at: string;
}

// File upload interfaces
export interface UploadFileRequest {
  session_id: number;
  file: File;
}

export interface UploadedFileResponse {
  id: number;
  session_id: number;
  filename: string;
  file_size: number;
  uploaded_at: string;
}

// AI interfaces
export interface IngestRequest {
  session_id: number;
  user_id: number;
}

export interface IngestResponse {
  message: string;
  document_count: number;
}

export interface QueryRequest {
  query: string;
  session_id: number;
  user_id: number;
}

export interface SourceCitation {
  source: string;
  page?: number;
  confidence: number;
}

export interface QueryResponse {
  answer: string;
  sources: SourceCitation[];
}

export interface EmbeddingRequest {
  text: string;
}

export interface EmbeddingResponse {
  embedding: number[];
}

// API functions

// Health check
export const healthCheck = async (): Promise<AxiosResponse<{ status: string }>> => {
  return api.get('/health');
};

// Root endpoint
export const root = async (): Promise<AxiosResponse<{ message: string }>> => {
  return api.get('/');
};

// Auth endpoints
export const register = async (data: RegisterRequest): Promise<AxiosResponse<TokenResponse>> => {
  return api.post('/register', data);
};

export const login = async (data: LoginRequest): Promise<AxiosResponse<TokenResponse>> => {
  return api.post('/login', data);
};

export const getCurrentUser = async (): Promise<AxiosResponse<UserProfile>> => {
  return api.get('/me');
};

// User endpoints
export const getUser = async (userId: number): Promise<AxiosResponse<UserResponse>> => {
  return api.get(`/${userId}`);
};

export const updateUser = async (userId: number, data: UserUpdateRequest): Promise<AxiosResponse<UserResponse>> => {
  return api.put(`/${userId}`, data);
};

export const deleteUser = async (userId: number): Promise<AxiosResponse<{ message: string }>> => {
  return api.delete(`/${userId}`);
};

export const listUsers = async (): Promise<AxiosResponse<UserResponse[]>> => {
  return api.get('/');
};

// Session endpoints
export const createSession = async (data: SessionCreateRequest): Promise<AxiosResponse<SessionResponse>> => {
  return api.post('/', data);
};

export const listSessions = async (): Promise<AxiosResponse<SessionResponse[]>> => {
  return api.get('/');
};

export const getSessionMessages = async (sessionId: number): Promise<AxiosResponse<MessageResponse[]>> => {
  return api.get(`/${sessionId}/messages`);
};

// File upload endpoints
export const uploadFile = async (data: UploadFileRequest): Promise<AxiosResponse<UploadedFileResponse>> => {
  const formData = new FormData();
  formData.append('session_id', data.session_id.toString());
  formData.append('file', data.file);
  
  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// AI endpoints
export const ingestDocuments = async (data: IngestRequest): Promise<AxiosResponse<IngestResponse>> => {
  return api.post('/ingest', data);
};

export const query = async (data: QueryRequest): Promise<AxiosResponse<QueryResponse>> => {
  return api.post('/query', data);
};

export const generateEmbedding = async (data: EmbeddingRequest): Promise<AxiosResponse<EmbeddingResponse>> => {
  return api.post('/embed', data);
};

export const queryStream = async (data: QueryRequest): Promise<Response> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${baseURL}/query/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response;
};

// Export the api instance for custom requests
export default api;
```