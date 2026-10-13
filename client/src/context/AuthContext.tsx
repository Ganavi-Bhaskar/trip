import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/resources'
import type { User } from '../types/models'

interface AuthValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const logout = () => {
    localStorage.removeItem('tripsplit-token')
    setUser(null)
  }

  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener('tripsplit:unauthorized', handleUnauthorized)
    const token = localStorage.getItem('tripsplit-token')
    if (!token) {
      setLoading(false)
      return () => window.removeEventListener('tripsplit:unauthorized', handleUnauthorized)
    }
    void api.auth.me().then(setUser).catch(logout).finally(() => setLoading(false))
    return () => window.removeEventListener('tripsplit:unauthorized', handleUnauthorized)
  }, [])

  const authenticate = async (request: () => Promise<{ user: User; token: string }>) => {
    const result = await request()
    localStorage.setItem('tripsplit-token', result.token)
    setUser(result.user)
  }

  return <AuthContext.Provider value={{ user, loading, logout, setUser, login: (email, password) => authenticate(() => api.auth.login({ email, password })), register: (name, email, password) => authenticate(() => api.auth.register({ name, email, password })) }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}