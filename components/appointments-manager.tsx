"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Calendar, Clock, Edit, Plus, Trash2, User, Scissors, Search, Filter, Copy, Phone, DollarSign, AlertCircle, MessageSquare, ChevronLeft, ChevronRight, Check, ChevronsUpDown } from "lucide-react"
import { CalendarView } from "@/components/calendar-view"
import { supabase, type Appointment, type Client, type Service } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export function AppointmentsManager() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("list")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Estados para el selector de cliente
  const [clientSearchOpen, setClientSearchOpen] = useState(false)
  const [clientSearchValue, setClientSearchValue] = useState("")
  
  const { toast } = useToast()

  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const appointmentsPerPage = 5

  const [formData, setFormData] = useState<{
    client_id: string
    service_id: string
    appointment_date: string
    deposit_amount: string
    notes: string
    status: "scheduled" | "completed" | "cancelled"
  }>({
    client_id: "",
    service_id: "",
    appointment_date: "",
    deposit_amount: "0",
    notes: "",
    status: "scheduled",
  })

  // Cliente seleccionado para mostrar en el selector
  const selectedClient = clients.find(client => client.id.toString() === formData.client_id)
  
  // Clientes filtrados para la búsqueda
  const filteredClients = useMemo(() => {
    if (!clientSearchValue) return clients
    return clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase()
      const phone = client.phone_number?.toLowerCase() || ''
      return fullName.includes(clientSearchValue.toLowerCase()) || 
             phone.includes(clientSearchValue.toLowerCase())
    })
  }, [clients, clientSearchValue])

  useEffect(() => {
    fetchData()
  }, [])

  // Filtrar y buscar citas
  const filteredAppointments = useMemo(() => {
    let filtered = appointments

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(appointment => {
        const clientName = `${appointment.clients?.first_name} ${appointment.clients?.last_name}`.toLowerCase()
        const serviceName = appointment.services?.name?.toLowerCase() || ''
        const notes = appointment.notes?.toLowerCase() || ''
        return clientName.includes(searchTerm.toLowerCase()) || 
               serviceName.includes(searchTerm.toLowerCase()) ||
               notes.includes(searchTerm.toLowerCase())
      })
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter)
    }

    // Filtro por fecha
    if (dateFilter !== 'all') {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)

      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.appointment_date)
        switch (dateFilter) {
          case 'today':
            return appointmentDate.toDateString() === today.toDateString()
          case 'tomorrow':
            return appointmentDate.toDateString() === tomorrow.toDateString()
          case 'week':
            return appointmentDate >= today && appointmentDate <= nextWeek
          case 'past':
            return appointmentDate < today
          default:
            return true
        }
      })
    }

    return filtered.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
  }, [appointments, searchTerm, statusFilter, dateFilter])

  // Resetear a la primera página cuando cambien filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, dateFilter])

  // Cálculo de paginación
  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / appointmentsPerPage))
  const startIndex = (currentPage - 1) * appointmentsPerPage
  const currentAppointments = filteredAppointments.slice(startIndex, startIndex + appointmentsPerPage)

  const fetchData = async () => {
    try {
      // Fetch appointments with client and service data
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select(`
          *,
          clients (id, first_name, last_name, phone_number),
          services (id, name, price, duration_minutes)
        `)
        .order("appointment_date", { ascending: true })

      // Fetch clients
      const { data: clientsData } = await supabase.from("clients").select("*").order("first_name")

      // Fetch services
      const { data: servicesData } = await supabase.from("services").select("*").order("name")

      setAppointments(appointmentsData || [])
      setClients(clientsData || [])
      setServices(servicesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Validar formulario
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.client_id) {
      errors.client_id = "Debe seleccionar un cliente"
    }

    if (!formData.service_id) {
      errors.service_id = "Debe seleccionar un servicio"
    }

    if (!formData.appointment_date) {
      errors.appointment_date = "Debe seleccionar fecha y hora"
    } else {
      const appointmentDate = new Date(formData.appointment_date)
      const now = new Date()
      if (appointmentDate < now) {
        errors.appointment_date = "La fecha no puede ser en el pasado"
      }
    }

    if (formData.deposit_amount && Number.parseFloat(formData.deposit_amount) < 0) {
      errors.deposit_amount = "El depósito no puede ser negativo"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const resetForm = () => {
    setFormData({
      client_id: "",
      service_id: "",
      appointment_date: "",
      deposit_amount: "0",
      notes: "",
      status: "scheduled",
    })
    setEditingAppointment(null)
    setFormErrors({})
    setClientSearchValue("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const appointmentData = {
        client_id: parseInt(formData.client_id),
        service_id: parseInt(formData.service_id),
        appointment_date: formData.appointment_date,
        deposit_amount: parseFloat(formData.deposit_amount) || 0,
        notes: formData.notes,
        status: formData.status,
      }

      if (editingAppointment) {
        const { error } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", editingAppointment.id)

        if (error) throw error
        
        toast({
          title: "Éxito",
          description: "Cita actualizada correctamente"
        })
      } else {
        const { error } = await supabase
          .from("appointments")
          .insert([appointmentData])

        if (error) throw error
        
        toast({
          title: "Éxito",
          description: "Cita creada correctamente"
        })
      }

      setDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error saving appointment:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la cita",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setFormData({
      client_id: appointment.client_id.toString(),
      service_id: appointment.service_id.toString(),
      appointment_date: appointment.appointment_date,
      deposit_amount: appointment.deposit_amount?.toString() || "0",
      notes: appointment.notes || "",
      status: appointment.status,
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta cita?")) {
      return
    }

    try {
      // Primero verificar si la cita tiene facturas asociadas
      const { data: invoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("id")
        .eq("appointment_id", id)

      if (invoiceError) {
        console.error("Error checking invoices:", invoiceError)
        throw new Error("Error al verificar facturas asociadas")
      }

      if (invoices && invoices.length > 0) {
        toast({
          title: "Error",
          description: "No se puede eliminar la cita porque tiene facturas asociadas. Elimina primero las facturas.",
          variant: "destructive"
        })
        return
      }

      // Si no hay facturas, proceder con la eliminación
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }
      
      toast({
        title: "Éxito",
        description: "Cita eliminada correctamente"
      })
      
      fetchData()
    } catch (error: any) {
      console.error("Error deleting appointment:", error)
      let errorMessage = "Error desconocido"
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (error?.hint) {
        errorMessage = error.hint
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: "Error",
        description: `No se pudo eliminar la cita: ${errorMessage}`,
        variant: "destructive"
      })
    }
  }

  const handleDuplicate = (appointment: Appointment) => {
    setFormData({
      client_id: appointment.client_id.toString(),
      service_id: appointment.service_id.toString(),
      appointment_date: "",
      deposit_amount: appointment.deposit_amount?.toString() || "0",
      notes: appointment.notes || "",
      status: "scheduled",
    })
    setEditingAppointment(null)
    setFormErrors({})
    setDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: "default",
      completed: "secondary",
      cancelled: "destructive",
    } as const

    const labels = {
      scheduled: "Programada",
      completed: "Completada",
      cancelled: "Cancelada",
    }

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gestión de Citas</h2>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Citas</h2>
          <p className="text-muted-foreground">
            {filteredAppointments.length} de {appointments.length} citas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl min-w-[70vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingAppointment ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingAppointment ? "Editar Cita" : "Nueva Cita"}
              </DialogTitle>
            </DialogHeader>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente *
                  </Label>
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientSearchOpen}
                        className={`w-full justify-between ${formErrors.client_id ? "border-destructive" : ""}`}
                      >
                        {selectedClient ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {selectedClient.first_name} {selectedClient.last_name}
                            {selectedClient.phone_number && (
                              <span className="text-xs text-muted-foreground">({selectedClient.phone_number})</span>
                            )}
                          </div>
                        ) : (
                          "Seleccionar cliente..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar cliente..." 
                          value={clientSearchValue}
                          onValueChange={setClientSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                          <CommandGroup>
                            {filteredClients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.first_name} ${client.last_name} ${client.phone_number || ''}`}
                                onSelect={() => {
                                  setFormData({ ...formData, client_id: client.id.toString() })
                                  setClientSearchOpen(false)
                                  setClientSearchValue("")
                                  if (formErrors.client_id) {
                                    setFormErrors({ ...formErrors, client_id: "" })
                                  }
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    formData.client_id === client.id.toString() ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {client.first_name} {client.last_name}
                                  {client.phone_number && (
                                    <span className="text-xs text-muted-foreground">({client.phone_number})</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formErrors.client_id && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.client_id}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_id" className="flex items-center gap-2">
                    <Scissors className="h-4 w-4" />
                    Servicio *
                  </Label>
                  <Select
                    value={formData.service_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, service_id: value })
                      if (formErrors.service_id) {
                        setFormErrors({ ...formErrors, service_id: "" })
                      }
                    }}
                  >
                    <SelectTrigger className={formErrors.service_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Scissors className="h-4 w-4" />
                              {service.name}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              {service.price}
                              {service.duration_minutes && (
                                <span>• {service.duration_minutes}min</span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.service_id && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.service_id}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment_date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha y Hora *
                  </Label>
                  <Input
                    id="appointment_date"
                    type="datetime-local"
                    value={formData.appointment_date}
                    onChange={(e) => {
                      setFormData({ ...formData, appointment_date: e.target.value })
                      if (formErrors.appointment_date) {
                        setFormErrors({ ...formErrors, appointment_date: "" })
                      }
                    }}
                    className={formErrors.appointment_date ? "border-destructive" : ""}
                  />
                  {formErrors.appointment_date && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.appointment_date}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposit_amount" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Depósito
                  </Label>
                  <Input
                    id="deposit_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.deposit_amount}
                    onChange={(e) => {
                      setFormData({ ...formData, deposit_amount: e.target.value })
                      if (formErrors.deposit_amount) {
                        setFormErrors({ ...formErrors, deposit_amount: "" })
                      }
                    }}
                    className={formErrors.deposit_amount ? "border-destructive" : ""}
                  />
                  {formErrors.deposit_amount && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.deposit_amount}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Estado
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "scheduled" | "completed" | "cancelled") => {
                    setFormData({ ...formData, status: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Programada</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notas
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionales sobre la cita..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="button" onClick={handleSubmit} className="flex-1 gap-2">
                  {editingAppointment ? (
                    <>
                      <Edit className="h-4 w-4" />
                      Actualizar Cita
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Crear Cita
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="gap-2">
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, servicio o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="scheduled">Programadas</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fechas</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="tomorrow">Mañana</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="past">Pasadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="gap-2">
            <User className="h-4 w-4" />
            Lista de Citas
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Vista de Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {currentAppointments.map((appointment) => {
              const appointmentDate = new Date(appointment.appointment_date);
              const isToday = appointmentDate.toDateString() === new Date().toDateString();
              const isPast = appointmentDate < new Date() && !isToday;
              
              return (
                <Card key={appointment.id} className={`hover:shadow-md transition-all duration-200 ${
                  isToday ? 'ring-2 ring-blue-500 bg-blue-50/50' : 
                  isPast ? 'opacity-75' : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {appointment.clients?.first_name} {appointment.clients?.last_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-muted-foreground" />
                            <span>{appointment.services?.name}</span>
                            {appointment.services?.price && (
                              <span className="text-sm text-green-600 font-medium">
                                ${appointment.services.price}
                              </span>
                            )}
                          </div>
                          {getStatusBadge(appointment.status)}
                          {isToday && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                              Hoy
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {appointmentDate.toLocaleDateString('es-ES', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {appointmentDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {appointment.deposit_amount > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              <span>${appointment.deposit_amount}</span>
                            </div>
                          )}
                          {appointment.clients?.phone_number && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              <span>{appointment.clients.phone_number}</span>
                            </div>
                          )}
                        </div>

                        {appointment.notes && (
                          <div className="flex items-start gap-2 mt-2 p-2 bg-muted/50 rounded">
                            <p className="text-sm text-muted-foreground italic">
                              {appointment.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(appointment)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDuplicate(appointment)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => handleDelete(appointment.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredAppointments.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Calendar className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-lg mb-2">
                        {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                          ? 'No se encontraron citas con los filtros aplicados'
                          : 'No hay citas programadas'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                          ? 'Intenta ajustar los filtros de búsqueda'
                          : 'Crea tu primera cita usando el botón "Nueva Cita"'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Controles de paginación */}
          {filteredAppointments.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}–{Math.min(startIndex + appointmentsPerPage, filteredAppointments.length)} de {filteredAppointments.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="text-sm">
                  Página {currentPage} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4 mt-6">
          <CalendarView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
