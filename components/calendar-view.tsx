"use client"

import { Calendar } from "@/components/ui/calendar"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, User, Scissors, CalendarIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Appointment {
  id: number
  appointment_date: string
  appointment_time: string
  status: string
  client_name: string
  client_phone: string
  service_name: string
  service_duration: number
}

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  // Obtener citas del mes actual
  useEffect(() => {
    fetchAppointments()
  }, [selectedDate])

  // Filtrar citas por estado
  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredAppointments(appointments)
    } else {
      setFilteredAppointments(appointments.filter((apt) => apt.status === statusFilter))
    }
  }, [appointments, statusFilter])

  const fetchAppointments = async () => {
    if (!selectedDate) return

    setLoading(true)
    try {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          clients!inner (
            first_name,
            last_name,
            phone_number
          ),
          services!inner (
            name,
            duration_minutes
          )
        `)
        .gte("appointment_date", startOfMonth.toISOString())
        .lte("appointment_date", endOfMonth.toISOString())
        .order("appointment_date", { ascending: true })

      if (error) throw error

      const transformedData =
        data?.map((apt: any) => ({
          id: apt.id,
          appointment_date: new Date(apt.appointment_date).toISOString().split("T")[0],
          appointment_time: new Date(apt.appointment_date).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: apt.status,
          client_name: `${apt.clients.first_name} ${apt.clients.last_name}`,
          client_phone: apt.clients.phone_number,
          service_name: apt.services.name,
          service_duration: apt.services.duration_minutes,
        })) || []

      setAppointments(transformedData)
    } catch (error) {
      console.error("Error fetching appointments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getAppointmentsForDate = (date: Date) => {
    if (!date) return []
    const dateStr = date.toISOString().split("T")[0]
    return filteredAppointments.filter((apt) => apt.appointment_date === dateStr)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Programada"
      case "completed":
        return "Completada"
      case "cancelled":
        return "Cancelada"
      default:
        return status
    }
  }

  const modifiers = {
    hasAppointments: (date: Date) => {
      if (!date) return false
      const appointments = getAppointmentsForDate(date)
      return appointments.length > 0
    },
    hasScheduled: (date: Date) => {
      if (!date) return false
      const appointments = getAppointmentsForDate(date)
      return appointments.some((apt) => apt.status === "scheduled")
    },
    hasCompleted: (date: Date) => {
      if (!date) return false
      const appointments = getAppointmentsForDate(date)
      return appointments.some((apt) => apt.status === "completed")
    },
    hasCancelled: (date: Date) => {
      if (!date) return false
      const appointments = getAppointmentsForDate(date)
      return appointments.some((apt) => apt.status === "cancelled")
    },
  }

  const modifiersStyles = {
    hasScheduled: {
      backgroundColor: "rgb(219 234 254)",
      color: "rgb(30 64 175)",
      fontWeight: "600",
    },
    hasCompleted: {
      backgroundColor: "rgb(220 252 231)",
      color: "rgb(22 101 52)",
      fontWeight: "600",
    },
    hasCancelled: {
      backgroundColor: "rgb(254 226 226)",
      color: "rgb(153 27 27)",
      fontWeight: "600",
    },
  }

  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : []

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Calendario de Citas</h1>
        <p className="text-muted-foreground">Visualiza y gestiona todas las citas programadas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-serif">Calendario de Citas</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las citas</SelectItem>
                  <SelectItem value="scheduled">Programadas</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Cargando calendario...</div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  className="rounded-md border shadow-sm"
                  showOutsideDays={true}
                />
              </div>
            )}

            {/* Leyenda para explicar los colores */}
            <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                <span className="text-gray-600">Programadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                <span className="text-gray-600">Completadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
                <span className="text-gray-600">Canceladas</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel de citas del día seleccionado */}
        <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-serif text-gray-800 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-purple-600" />
              {selectedDate
                ? `${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`
                : "Selecciona una fecha"}
            </CardTitle>
            {selectedDate && selectedDateAppointments.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedDateAppointments.length} cita{selectedDateAppointments.length !== 1 ? "s" : ""} programada
                {selectedDateAppointments.length !== 1 ? "s" : ""}
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {selectedDate ? (
              selectedDateAppointments.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="group p-4 border border-gray-200 rounded-xl bg-white hover:shadow-md hover:border-purple-200 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Clock className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">{appointment.appointment_time}</span>
                            <p className="text-xs text-gray-500">Hora de la cita</p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(appointment.status)} font-medium`}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <User className="h-4 w-4 text-gray-600" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">{appointment.client_name}</span>
                            <p className="text-xs text-gray-500">{appointment.client_phone}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
                          <Scissors className="h-4 w-4 text-purple-600" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">{appointment.service_name}</span>
                            <p className="text-xs text-purple-600">{appointment.service_duration} minutos</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <CalendarIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">Sin citas programadas</h3>
                  <p className="text-sm text-gray-500">No hay citas para esta fecha</p>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <CalendarIcon className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Selecciona una fecha</h3>
                <p className="text-sm text-gray-500">Haz clic en cualquier día del calendario para ver las citas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
