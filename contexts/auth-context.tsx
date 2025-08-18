'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  username: string
}

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Mark that we're now on the client side
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Only run localStorage logic after we're on the client
    if (!isClient) return

    // Verificar si hay un usuario guardado en localStorage al cargar la aplicación
    const checkStoredUser = () => {
      try {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          // Verificar si la sesión no ha expirado (24 horas)
          const loginTime = new Date(userData.loginTime)
          const now = new Date()
          const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
          
          if (hoursDiff < 24) {
            setUser({
              id: userData.id,
              username: userData.username
            })
          } else {
            // Sesión expirada, limpiar localStorage
            localStorage.removeItem('user')
          }
        }
      } catch (error) {
        console.error('Error al verificar usuario almacenado:', error)
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    checkStoredUser()
  }, [isClient])

  const login = (userData: User) => {
    setUser(userData)
    // El localStorage ya se maneja en el componente LoginForm
  }

  const logout = () => {
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
    }
  }

  const value = {
    user,
    login,
    logout,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}