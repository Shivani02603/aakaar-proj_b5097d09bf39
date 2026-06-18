'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { createSession } from '@/lib/api'

const inter = Inter({ subsets: ['latin'] })

export default function NewSessionPage() {
  const router = useRouter()
  const [name, setName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Session name is required')
      return
    }
    if (!userId.trim()) {
      setError('User ID is required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await createSession({ name, user_id: userId })
      router.push('/sessions')
    } catch (err) {
      setError('Failed to create session. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-6 ${inter.className}`}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/sessions"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            &larr; Back to Sessions
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Create New Session</h1>
          <p className="text-gray-600 mt-2">Create a new chat session for document Q&A.</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Session Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="e.g., Quarterly Report Analysis"
                required
              />
              <p className="mt-1 text-sm text-gray-500">A descriptive name for this session.</p>
            </div>

            <div className="mb-8">
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                User ID *
              </label>
              <input
                type="text"
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter user ID"
                required
              />
              <p className="mt-1 text-sm text-gray-500">The ID of the user who owns this session.</p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Link
                href="/sessions"
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}