import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface User {
  name: string
  username: string
  email: string
  avatar: string
}

interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    name: "Traveller",
    username: "traveller",
    email: "traveller@example.com",
    avatar: "https://i.pinimg.com/736x/35/e2/78/35e2788fd9c56df3d3c51287549d5c0a.jpg",
  })

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}