'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

interface AiSession {
  id: string
  user_id: string
  name: string
  created_at: string
}

interface AiMessage {
  id: string
  session_id: string
  role: string
  content: string
  source_citations: string | null
  created_at: string
}

interface AiUploadedFile {
  id: string
  session_id: string
  filename: string
  file_size: number
  uploaded_at: string
}

interface AiDocumentChunk {
  id: string
  uploaded_file_id: string
  chunk_index: number
  content: string
  row_start: number | null
  row_end: number | null
  embedding: number[] | null
  created_at: string
}

type AiResource = 'sessions' | 'messages' | 'files' | 'chunks'

export default function AiPage() {
  const [activeResource, setActiveResource] = useState<AiResource>('sessions')
  const [sessions, setSessions] = useState<AiSession[]>([])
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [files, setFiles] = useState<AiUploadedFile[]>([])
  const [chunks, setChunks] = useState<AiDocumentChunk[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sessions')
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`)
      }
      const data = await response.json()
      setSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sessions/messages')
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }
      const data = await response.json()
      setMessages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/files')
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`)
      }
      const data = await response.json()
      setFiles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchChunks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/chunks')
      if (!response.ok) {
        throw new Error(`Failed to fetch chunks: ${response.statusText}`)
      }
      const data = await response.json()
      setChunks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    switch (activeResource) {
      case 'sessions':
        fetchSessions()
        break
      case 'messages':
        fetchMessages()
        break
      case 'files':
        fetchFiles()
        break
      case 'chunks':
        fetchChunks()
        break
    }
  }, [activeResource])

  const handleDelete = async (resource: AiResource, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    setDeletingId(id)
    try {
      let endpoint = ''
      switch (resource) {
        case 'sessions':
          endpoint = `/api/sessions/${id}`
          break
        case 'messages':
          endpoint = `/api/messages/${id}`
          break
        case 'files':
          endpoint = `/api/files/${id}`
          break
        case 'chunks':
          endpoint = `/api/chunks/${id}`
          break
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`)
      }

      switch (resource) {
        case 'sessions':
          setSessions(sessions.filter(s => s.id !== id))
          break
        case 'messages':
          setMessages(messages.filter(m => m.id !== id))
          break
        case 'files':
          setFiles(files.filter(f => f.id !== id))
          break
        case 'chunks':
          setChunks(chunks.filter(c => c.id !== id))
          break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-6 ${inter.className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Module Resources</h1>
          <div className="flex gap-4">
            <Link
              href="/ai/new"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Chat
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveResource('sessions')}
              className={`px-4 py-2 font-medium text-sm ${activeResource === 'sessions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sessions
            </button>
            <button
              onClick={() => setActiveResource('messages')}
              className={`px-4 py-2 font-medium text-sm ${activeResource === 'messages' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Messages
            </button>
            <button
              onClick={() => setActiveResource('files')}
              className={`px-4 py-2 font-medium text-sm ${activeResource === 'files' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Uploaded Files
            </button>
            <button
              onClick={() => setActiveResource('chunks')}
              className={`px-4 py-2 font-medium text-sm ${activeResource === 'chunks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Document Chunks
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {activeResource === 'sessions' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No sessions found
                        </td>
                      </tr>
                    ) : (
                      sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {session.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {session.user_id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {session.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(session.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDelete('sessions', session.id)}
                              disabled={deletingId === session.id}
                              className="text-red-600 hover:text-red-900 disabled:text-red-300"
                            >
                              {deletingId === session.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeResource === 'messages' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content Preview
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {messages.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No messages found
                        </td>
                      </tr>
                    ) : (
                      messages.map((message) => (
                        <tr key={message.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {message.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {message.session_id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${message.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                              {message.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                            {message.content.substring(0, 100)}
                            {message.content.length > 100 && '...'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(message.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDelete('messages', message.id)}
                              disabled={deletingId === message.id}
                              className="text-red-600 hover:text-red-900 disabled:text-red-300"
                            >
                              {deletingId === message.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeResource === 'files' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Filename
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Uploaded At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {files.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No files found
                        </td>
                      </tr>
                    ) : (
                      files.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {file.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {file.session_id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {file.filename}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatFileSize(file.file_size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(file.uploaded_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDelete('files', file.id)}
                              disabled={deletingId === file.id}
                              className="text-red-600 hover:text-red-900 disabled:text-red-300"
                            >
                              {deletingId === file.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeResource === 'chunks' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Index
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content Preview
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rows
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {chunks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          No chunks found
                        </td>
                      </tr>
                    ) : (
                      chunks.map((chunk) => (
                        <tr key={chunk.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {chunk.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {chunk.uploaded_file_id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {chunk.chunk_index}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                            {chunk.content.substring(0, 80)}
                            {chunk.content.length > 80 && '...'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {chunk.row_start !== null && chunk.row_end !== null ? `${chunk.row_start}-${chunk.row_end}` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(chunk.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDelete('chunks', chunk.id)}
                              disabled={deletingId === chunk.id}
                              className="text-red-600 hover:text-red-900 disabled:text-red-300"
                            >
                              {deletingId === chunk.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}