"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Calendar, Users, Scissors, Receipt, BarChart3, Menu, X, Sparkles, LogOut, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user: { id: string; username: string }
}

export function Sidebar({ activeTab, onTabChange, user }: SidebarProps) {
  const { logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "appointments", label: "Citas", icon: Calendar },
    { id: "calendar", label: "Calendario", icon: Calendar },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "services", label: "Servicios", icon: Scissors },
    { id: "invoices", label: "Facturas", icon: Receipt },
  ]

  const handleTabChange = (tab: string) => {
    onTabChange(tab)
    setIsOpen(false)
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <Card
        className={`
        fixed left-0 top-0 h-full w-72 z-40 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        border-r bg-gradient-to-b from-primary/5 to-accent/5
      `}
      >
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/images/LOGO.PNG" alt="Lucero Glam Studio Logo" className="h-full w-full object-cover rounded-xl" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground">Lucero Glam</h1>
              <p className="text-sm text-muted-foreground">Studio</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className={`
                    w-full justify-start gap-3 h-12 text-left
                    ${activeTab === item.id ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-accent/50"}
                  `}
                  onClick={() => handleTabChange(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              )
            })}
          </nav>

          {/* User info and logout */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center gap-3 mb-4 p-3 bg-accent/30 rounded-lg">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.username}
                </p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </Card>
    </>
  )
}
