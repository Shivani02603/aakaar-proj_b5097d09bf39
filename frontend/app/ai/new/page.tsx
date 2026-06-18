'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

type ResourceType = 'session' | 'message' | 'file' | 'chunk'

interface SessionFormData {
  user_id: string
  name: string
}

interface MessageFormData {
  session_id: string
  role: 'user' | 'assistant'
  content: string
  source_citations: string
}

interface FileFormData {
  session_id: string
  filename: string
  file_size: string
}

interface ChunkFormData {
  uploaded_file_id: string
  chunk_index: string
  content: string
  row_start: string
  row_end: string
}

export default function NewAiPage() {
  const router = useRouter()
  const [resourceType, setResourceType] = useState<ResourceType>('session')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [sessionForm, setSessionForm] = useState<SessionFormData>({
    user_id: '',
    name: '',
  })

  const [messageForm, setMessageForm] = useState<MessageFormData>({
    session_id: '',
    role: 'user',
    content: '',
    source_citations: '',
  })

  const [fileForm, setFileForm] = useState<FileFormData>({
    session_id: '',
    filename: '',
    file_size: '',
  })

  const [chunkForm, setChunkForm] = useState<ChunkFormData>({
    uploaded_file_id: '',
    chunk_index: '',
    content: '',
    row_start: '',
    row_end: '',
  })

  const validateForm = (): boolean => {
    setError(null)

    if (resourceType === 'session') {
      if (!sessionForm.user_id.trim()) {
        setError('User ID is required')
        return false
      }
      if (!sessionForm.name.trim()) {
        setError('Session name is required')
        return false
      }
    }

    if (resourceType === 'message') {
      if (!messageForm.session_id.trim()) {
        setError('Session ID is required')
        return false
      }
      if (!messageForm.content.trim()) {
        setError('Message content is required')
        return false
      }
    }

    if (resourceType === 'file') {
      if (!fileForm.session_id.trim()) {
        setError('Session ID is required')
        return false
      }
      if (!fileForm.filename.trim()) {
        setError('Filename is required')
        return false
      }
      const fileSize = parseInt(fileForm.file_size)
      if (isNaN(fileSize) || fileSize < 0) {
        setError('File size must be a positive number')
        return false
      }
    }

    if (resourceType === 'chunk') {
      if (!chunkForm.uploaded_file_id.trim()) {
        setError('Uploaded File ID is required')
        return false
      }
      const chunkIndex = parseInt(chunkForm.chunk_index)
      if (isNaN(chunkIndex) || chunkIndex < 0) {
        setError('Chunk index must be a non-negative number')
        return false
      }
      if (!chunkForm.content.trim()) {
        setError('Content is required')
        return false
      }
      const rowStart = chunkForm.row_start ? parseInt(chunkForm.row_start) : null
      const rowEnd = chunkForm.row_end ? parseInt(chunkForm.row_end) : null
      if (rowStart !== null && isNaN(rowStart)) {
        setError('Row start must be a number if provided')
        return false
      }
      if (rowEnd !== null && isNaN(rowEnd)) {
        setError('Row end must be a number if provided')
        return false
      }
      if (rowStart !== null && rowEnd !== null && rowStart > rowEnd) {
        setError('Row start must be less than or equal to row end')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      let endpoint = ''
      let body: unknown = {}

      switch (resourceType) {
        case 'session':
          endpoint = '/api/sessions'
          body = {
            user_id: sessionForm.user_id,
            name: sessionForm.name,
          }
          break
        case 'message':
          endpoint = '/api/messages'
          body = {
            session_id: messageForm.session_id,
            role: messageForm.role,
            content: messageForm.content,
            source_citations: messageForm.source_citations || null,
          }
          break
        case 'file':
          endpoint = '/api/files'
          body = {
            session_id: fileForm.session_id,
            filename: fileForm.filename,
            file_size: parseInt(fileForm.file_size),
          }
          break
        case 'chunk':
          endpoint = '/api/chunks'
          body = {
            uploaded_file_id: chunkForm.uploaded_file_id,
            chunk_index: parseInt(chunkForm.chunk_index),
            content: chunkForm.content,
            row_start: chunkForm.row_start ? parseInt(chunkForm.row_start) : null,
            row_end: chunkForm.row_end ? parseInt(chunkForm.row_end) : null,
          }
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to create ${resourceType}: ${response.statusText}`)
      }

      router.push('/ai')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSessionForm({ user_id: '', name: '' })
    setMessageForm({ session_id: '', role: 'user', content: '', source_citations: '' })
    setFileForm({ session_id: '', filename: '', file_size: '' })
    setChunkForm({ uploaded_file_id: '', chunk_index: '', content: '', row_start: '', row_end: '' })
    setError(null)
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-6 ${inter.className}`}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New AI Resource</h1>
          <p className="text-gray-600">Select a resource type and fill in the required fields.</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setResourceType('session')}
              className={`px-4 py-2 rounded-lg font-medium ${resourceType === 'session' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              Session
            </button>
            <button
              onClick={() => setResourceType('message')}
              className={`px-4 py-2 rounded-lg font-medium ${resourceType === 'message' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              Message
            </button>
            <button
              onClick={() => setResourceType('file')}
              className={`px-4 py-2 rounded-lg font-medium ${resourceType === 'file' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              File
            </button>
            <button
              onClick={() => setResourceType('chunk')}
              className={`px-4 py-2 rounded-lg font-medium ${resourceType === 'chunk' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              Chunk
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {resourceType === 'session' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 mb-1">
                  User ID *
                </label>
                <input
                  type="text"
                  id="user_id"
                  value={sessionForm.user_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter user ID"
                  required
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Session Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={sessionForm.name}
                  onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter session name"
                  required
                />
              </div>
            </div>
          )}

          {resourceType === 'message' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="session_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Session ID *
                </label>
                <input
                  type="text"
                  id="session_id"
                  value={messageForm.session_id}
                  onChange={(e) => setMessageForm({ ...messageForm, session_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter session ID"
                  required
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  id="role"
                  value={messageForm.role}
                  onChange={(e) => setMessageForm({ ...messageForm, role: e.target.value as 'user' | 'assistant' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  id="content"
                  value={messageForm.content}
                  onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter message content"
                  required
                />
              </div>
              <div>
                <label htmlFor="source_citations" className="block text-sm font-medium text-gray-700 mb-1">
                  Source Citations (Optional)
                </label>
                <textarea
                  id="source_citations"
                  value={messageForm.source_citations}
                  onChange={(e) => setMessageForm({ ...messageForm, source_citations: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter source citations as JSON string"
                />
              </div>
            </div>
          )}

          {resourceType === 'file' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="file_session_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Session ID *
                </label>
                <input
                  type="text"
                  id="file_session_id"
                  value={fileForm.session_id}
                  onChange={(e) => setFileForm({ ...fileForm, session_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter session ID"
                  required
                />
              </div>
              <div>
                <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-1">
                  Filename *
                </label>
                <input
                  type="text"
                  id="filename"
                  value={fileForm.filename}
                  onChange={(e) => setFileForm({ ...fileForm, filename: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter filename"
                  required
                />
              </div>
              <div>
                <label htmlFor="file_size" className="block text-sm font-medium text-gray-700 mb-1">
                  File Size (bytes) *
                </label>
                <input
                  type="number"
                  id="file_size"
                  value={fileForm.file_size}
                  onChange={(e) => setFileForm({ ...fileForm, file_size: e.target.value })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter file size in bytes"
                  required
                />
              </div>
            </div>
          )}

          {resourceType === 'chunk' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="uploaded_file_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Uploaded File ID *
                </label>
                <input
                  type="text"
                  id="uploaded_file_id"
                  value={chunkForm.uploaded_file_id}
                  onChange={(e) => setChunkForm({ ...chunkForm, uploaded_file_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter uploaded file ID"
                  required
                />
              </div>
              <div>
                <label htmlFor="chunk_index" className="block text-sm font-medium text-gray-700 mb-1">
                  Chunk Index *
                </label>
                <input
                  type="number"
                  id="chunk_index"
                  value={chunkForm.chunk_index}
                  onChange={(e) => setChunkForm({ ...chunkForm, chunk_index: e.target.value })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter chunk index"
                  required
                />
              </div>
              <div>
                <label htmlFor="chunk_content" className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  id="chunk_content"
                  value={chunkForm.content}
                  onChange={(e) => setChunkForm({ ...chunkForm, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter chunk content"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="row_start" className="block text-sm font-medium text-gray-700 mb-1">
                    Row Start (Optional)
                  </label>
                  <input
                    type="number"
                    id="row_start"
                    value={chunkForm.row_start}
                    onChange={(e) => setChunkForm({ ...chunkForm, row_start: e.target.value })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label htmlFor="row_end" className="block text-sm font-medium text-gray-700 mb-1">
                    Row End (Optional)
                  </label>
                  <input
                    type="number"
                    id="row_end"
                    value={chunkForm.row_end}
                    onChange={(e) => setChunkForm({ ...chunkForm, row_end: e.target.value })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Reset Form
              </button>
              <Link
                href="/ai"
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {loading ? 'Creating...' : `Create ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`}
            </button>
          </div>
        </form>

        <div className="mt-6 text-sm text-gray-500">
          <p>
            <strong>Note:</strong> Fields marked with * are required. IDs should be valid UUIDs from existing records.
          </p>
        </div>
      </div>
    </div>
  )
}