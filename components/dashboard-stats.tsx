"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, DollarSign, Clock, TrendingUp, TrendingDown } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Stats {
  totalClients: number
  todayAppointments: number
  monthlyRevenue: number
  previousMonthRevenue: number
  pendingAppointments: number
  dailyRevenue: { date: string; amount: number }[]
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    previousMonthRevenue: 0,
    pendingAppointments: 0,
    dailyRevenue: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      console.log("[v0] Iniciando fetchStats...")

      // Total clients
      const { count: clientsCount } = await supabase.from("clients").select("*", { count: "exact", head: true })

      // Today's appointments
      const today = new Date().toISOString().split("T")[0]
      const { count: todayCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("appointment_date", `${today}T00:00:00`)
        .lt("appointment_date", `${today}T23:59:59`)

      // Pending appointments
      const { count: pendingCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "scheduled")

      // Current month revenue
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth()

      // Primer día del mes actual
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString()
      // Primer día del siguiente mes
      const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1).toISOString()

      console.log("[v0] Buscando facturas entre:", startOfMonth, "y", startOfNextMonth)

      const { data: currentInvoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("total_amount, invoice_date")
        .gte("invoice_date", startOfMonth)
        .lt("invoice_date", startOfNextMonth)

      console.log("[v0] Facturas encontradas:", currentInvoices)
      console.log("[v0] Error en consulta:", invoicesError)

      const monthlyRevenue = currentInvoices?.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0) || 0
      console.log("[v0] Ingresos mensuales calculados:", monthlyRevenue)

      // Previous month revenue for comparison
      const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()
      const startOfCurrentMonth = new Date(currentYear, currentMonth, 1).toISOString()

      const { data: previousInvoices } = await supabase
        .from("invoices")
        .select("total_amount")
        .gte("invoice_date", startOfPreviousMonth)
        .lt("invoice_date", startOfCurrentMonth)

      const previousMonthRevenue =
        previousInvoices?.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0) || 0

      // Daily revenue for current month (for mini chart)
      const dailyRevenue =
        currentInvoices?.reduce((acc: { [key: string]: number }, invoice) => {
          const date = invoice.invoice_date.split("T")[0]
          acc[date] = (acc[date] || 0) + Number(invoice.total_amount)
          return acc
        }, {}) || {}

      const dailyRevenueArray = Object.entries(dailyRevenue)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7) // Last 7 days

      console.log("[v0] Estadísticas finales:", {
        monthlyRevenue,
        previousMonthRevenue,
        dailyRevenueArray,
      })

      setStats({
        totalClients: clientsCount || 0,
        todayAppointments: todayCount || 0,
        monthlyRevenue,
        previousMonthRevenue,
        pendingAppointments: pendingCount || 0,
        dailyRevenue: dailyRevenueArray,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate revenue change percentage
  const revenueChange =
    stats.previousMonthRevenue > 0
      ? ((stats.monthlyRevenue - stats.previousMonthRevenue) / stats.previousMonthRevenue) * 100
      : 0

  const isRevenueUp = revenueChange > 0
  const TrendIcon = isRevenueUp ? TrendingUp : TrendingDown

  const statCards = [
    {
      title: "Total Clientes",
      value: stats.totalClients,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Citas Hoy",
      value: stats.todayAppointments,
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Citas Pendientes",
      value: stats.pendingAppointments,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-32 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Regular Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Enhanced Revenue Card */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Ingresos del Mes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-purple-600">${stats.monthlyRevenue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                Mes anterior: ${stats.previousMonthRevenue.toLocaleString()}
              </p>
            </div>
            <div
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                isRevenueUp
                  ? "bg-green-100 text-green-700"
                  : revenueChange < 0
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              <TrendIcon className="h-4 w-4" />
              {Math.abs(revenueChange).toFixed(1)}%
            </div>
          </div>

          {/* Mini Revenue Chart */}
          {stats.dailyRevenue.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Ingresos últimos 7 días</p>
              <div className="flex items-end gap-1 h-16">
                {stats.dailyRevenue.map((day, index) => {
                  const maxAmount = Math.max(...stats.dailyRevenue.map((d) => d.amount))
                  const height = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-purple-200 rounded-t transition-all hover:bg-purple-300"
                        style={{ height: `${height}%`, minHeight: day.amount > 0 ? "4px" : "2px" }}
                        title={`${day.date}: $${day.amount.toLocaleString()}`}
                      />
                      <span className="text-xs text-muted-foreground">{new Date(day.date).getDate()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Revenue Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Promedio Diario</p>
              <p className="font-semibold">
                ${Math.round(stats.monthlyRevenue / new Date().getDate()).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Servicios Facturados</p>
              <p className="font-semibold">
                {stats.dailyRevenue.reduce((sum, day) => sum + (day.amount > 0 ? 1 : 0), 0)} días
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
