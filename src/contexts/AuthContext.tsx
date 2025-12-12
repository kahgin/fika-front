import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  getAuthToken,
  getMe,
  type LoginPayload,
  type SignupPayload,
  type User,
} from '../services/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  signup: (payload: SignupPayload) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const userData = await getMe()
      setUser(userData)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await apiLogin(payload)
    setUser(response.user)
  }, [])

  const signup = useCallback(async (payload: SignupPayload) => {
    const response = await apiSignup(payload)
    setUser(response.user)
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
