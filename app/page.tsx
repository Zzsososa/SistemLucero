"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { DashboardStats } from "@/components/dashboard-stats"
import { AppointmentsManager } from "@/components/appointments-manager"
import { ClientsManager } from "@/components/clients-manager"
import { ServicesManager } from "@/components/services-manager"
import { InvoicesManager } from "@/components/invoices-manager"
import { Toaster } from "@/components/ui/toaster"
import { CalendarView } from "@/components/calendar-view"
import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true)
  const { user, login, isLoading } = useAuth()

  // Ocultar mensaje de bienvenida después de 20 segundos
  useEffect(() => {
    if (user && showWelcomeMessage) {
      const timer = setTimeout(() => {
        setShowWelcomeMessage(false)
      }, 20000) // 20 segundos

      return () => clearTimeout(timer)
    }
  }, [user, showWelcomeMessage])

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario autenticado, mostrar formulario de login
  if (!user) {
    return <LoginForm onLoginSuccess={login} />
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Mensaje de bienvenida - se oculta después de 20 segundos */}
            {showWelcomeMessage && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border border-amber-200/50 shadow-lg transition-all duration-500 ease-in-out">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-transparent to-orange-100/20"></div>
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <span className="text-2xl">✨</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent mb-2">
                      Bienvenida señorita Lucero a su sistema
                    </h2>
                    <p className="text-amber-700/80 text-sm sm:text-base font-medium">
                      Su centro de gestión está listo para ayudarle a brillar
                    </p>
                  </div>
                  {/* Botón para cerrar manualmente */}
                  <button
                    onClick={() => setShowWelcomeMessage(false)}
                    className="absolute top-4 right-4 text-amber-600 hover:text-amber-800 transition-colors duration-200"
                    aria-label="Cerrar mensaje"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground">Resumen general de Lucero Glam Studio</p>
            </div>
            <DashboardStats />
          </div>
        )
      case "appointments":
        return <AppointmentsManager />
      case "calendar":
        return <CalendarView />
      case "clients":
        return <ClientsManager />
      case "services":
        return <ServicesManager />
      case "invoices":
        return <InvoicesManager />
      default:
        return <div>Página no encontrada</div>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col md:flex-row">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} user={user} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 pt-16 md:pt-6">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
