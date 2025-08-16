'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LoginFormProps {
  onLoginSuccess: (user: { id: string; username: string }) => void
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Verificación temporal mientras se ejecuta el script SQL
      // TODO: Reemplazar con la función RPC después de ejecutar create-users-table.sql
      if (username === 'Lucero' && password === 'Lucero0716') {
        // Simular usuario autenticado temporalmente
        const user = {
          id: 'temp-user-id',
          username: 'Lucero'
        }
        
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          username: user.username,
          loginTime: new Date().toISOString()
        }))
        
        onLoginSuccess({
          id: user.id,
          username: user.username
        })
        return
      }

      // Intentar usar la función RPC si está disponible
      const { data, error } = await supabase
        .rpc('get_user_by_credentials', {
          username_input: username,
          password_input: password
        })

      if (error) {
        console.error('Error RPC:', error)
        // Si la función RPC no existe, mostrar mensaje específico
        if (error.message?.includes('function') || error.code === '42883') {
          setError('⚠️ Primero ejecuta el script SQL en Supabase (ver INSTRUCCIONES-LOGIN.md)')
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        const user = data[0]
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          username: user.username,
          loginTime: new Date().toISOString()
        }))
        
        onLoginSuccess({
          id: user.id,
          username: user.username
        })
      } else {
        setError('Usuario o contraseña incorrectos')
      }
    } catch (err: any) {
      console.error('Error de login:', err)
      
      // Manejo específico de errores
      if (err?.message?.includes('function') || err?.code === '42883') {
        setError('⚠️ Primero ejecuta el script SQL en Supabase (ver INSTRUCCIONES-LOGIN.md)')
      } else if (err?.message) {
        setError(`Error: ${err.message}`)
      } else {
        setError('Error al iniciar sesión. Por favor, intenta de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Mensaje de Bienvenida */}
        <div className="text-center space-y-4">
          <div className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
            <h1 className="text-4xl font-bold mb-2">✨ Bienvenida ✨</h1>
            <h2 className="text-2xl font-semibold">Señorita Lucero</h2>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-amber-200">
            <p className="text-amber-800 text-lg font-medium">
              Por favor inicie sesión para acceder al sistema
            </p>
          </div>
        </div>
        
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-amber-600">
              Lucero Glam Studio
            </CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Si olvidaste el usuario y contraseña:</p>
              <p><strong>Comunicate con:</strong> Victor tu novio</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}