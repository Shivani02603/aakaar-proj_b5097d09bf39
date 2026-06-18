interface User {
  id: number
  username: string
}

interface JwtPayload {
  sub: string
  exp: number
  iat: number
  user_id: number
  username: string
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('token')
}

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem('token', token)
}

export const removeToken = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem('token')
}

export const isAuthenticated = (): boolean => {
  const token = getToken()
  if (!token) return false

  try {
    const payload = parseJwt(token)
    if (!payload || !payload.exp) return false
    
    const currentTime = Math.floor(Date.now() / 1000)
    return payload.exp > currentTime
  } catch {
    return false
  }
}

export const getUser = (): User | null => {
  if (typeof window === 'undefined') {
    return null
  }
  
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  
  try {
    return JSON.parse(userStr) as User
  } catch {
    return null
  }
}

export const setUser = (user: User): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem('user', JSON.stringify(user))
}

export const removeUser = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem('user')
}

export const parseJwt = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload) as JwtPayload
  } catch {
    return null
  }
}

export const logout = (): void => {
  removeToken()
  removeUser()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}