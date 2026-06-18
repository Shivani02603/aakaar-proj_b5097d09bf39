'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

interface FormData {
  session_id: string
  file: File | null
}

interface ValidationErrors {
  session_id?: string
  file?: string
}

export default function NewFilePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    session_id: '',
    file: null,
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}

    if (!formData.session_id.trim()) {
      errors.session_id = 'Session ID is required'
    } else if (isNaN(Number(formData.session_id))) {
      errors.session_id = 'Session ID must be a number'
    }

    if (!formData.file) {
      errors.file = 'File is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({ ...prev, file }))
    if (validationErrors.file) {
      setValidationErrors(prev => ({ ...prev, file: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)

      const formDataToSend = new FormData()
      formDataToSend.append('session_id', formData.session_id)
      if (formData.file) {
        formDataToSend.append('file', formData.file)
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formDataToSend,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Upload failed: ${response.statusText}`)
      }

      router.push('/files')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-8 ${inter.className}`}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload New File</h1>
          <p className="text-gray-600 mt-2">Upload a file to associate with a session</p>
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

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="session_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Session ID *
                </label>
                <input
                  type="text"
                  id="session_id"
                  value={formData.session_id}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, session_id: e.target.value }))
                    if (validationErrors.session_id) {
                      setValidationErrors(prev => ({ ...prev, session_id: undefined }))
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.session_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter session ID"
                />
                {validationErrors.session_id && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.session_id}</p>
                )}
              </div>

              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                  File *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOCX, TXT, XLSX up to 10MB</p>
                  </div>
                </div>
                {formData.file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected file: <span className="font-medium">{formData.file.name}</span>
                  </p>
                )}
                {validationErrors.file && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.file}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}