'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUser, logout } from '@/lib/auth'

interface User {
  id: number
  username: string
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = getUser()
        setUser(currentUser)
      } catch (error) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-bold text-blue-600">
            Aakaar AI
          </Link>
          {user && (
            <div className="hidden md:flex space-x-6">
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 transition">
                Dashboard
              </Link>
              <Link href="/sessions" className="text-gray-700 hover:text-blue-600 transition">
                Sessions
              </Link>
              <Link href="/files" className="text-gray-700 hover:text-blue-600 transition">
                Files
              </Link>
              <Link href="/ai" className="text-gray-700 hover:text-blue-600 transition">
                AI Query
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
          ) : user ? (
            <>
              <div className="hidden md:block text-sm text-gray-600">
                Welcome, <span className="font-semibold">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}