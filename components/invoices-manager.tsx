"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Receipt, Plus, Trash2, User, Calendar, DollarSign, Printer, ChevronLeft, ChevronRight, Search, Filter, ArrowUpNarrowWide, Clock, TrendingUp } from "lucide-react"
import { supabase, type Appointment, type Service } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useMemo } from "react"

interface InvoiceWithDetails {
  id: number
  appointment_id: number
  total_amount: number
  paid_amount: number
  change_amount: number
  late_fee: number
  discount: number
  invoice_date: string
  notes?: string
  appointments: {
    id: number
    appointment_date: string
    clients: {
      first_name: string
      last_name: string
    }
    services: {
      name: string
      price: number
    }
  }
}

interface InvoiceItem {
  service_id?: number
  service_name: string
  unit_price: number
  quantity: number
  line_total: number
}

export function InvoicesManager() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<string>("")
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const invoicesPerPage = 5
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterBy, setFilterBy] = useState("all")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    total_amount: "0",
    paid_amount: "0",
    change_amount: "0",
    late_fee: "0",
    discount: "0",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter(invoice => {
      const clientName = `${invoice.appointments.clients.first_name} ${invoice.appointments.clients.last_name}`.toLowerCase()
      const serviceName = invoice.appointments.services.name.toLowerCase()
      const searchLower = searchTerm.toLowerCase()
      
      const matchesSearch = clientName.includes(searchLower) || 
                           serviceName.includes(searchLower) ||
                           invoice.id.toString().includes(searchLower)
      
      // Apply filters
      const now = new Date()
      const invoiceDate = new Date(invoice.invoice_date)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      let matchesFilter = true
      switch (filterBy) {
        case "recent":
          matchesFilter = invoiceDate >= sevenDaysAgo
          break
        case "month":
          matchesFilter = invoiceDate >= thirtyDaysAgo
          break
        case "high":
          matchesFilter = invoice.total_amount >= 100
          break
        case "pending":
          matchesFilter = invoice.paid_amount < invoice.total_amount
          break
        default:
          matchesFilter = true
      }
      
      return matchesSearch && matchesFilter
    })
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date
      
      switch (sortBy) {
        case "client":
          aValue = `${a.appointments.clients.first_name} ${a.appointments.clients.last_name}`.toLowerCase()
          bValue = `${b.appointments.clients.first_name} ${b.appointments.clients.last_name}`.toLowerCase()
          break
        case "amount":
          aValue = a.total_amount
          bValue = b.total_amount
          break
        case "service":
          aValue = a.appointments.services.name.toLowerCase()
          bValue = b.appointments.services.name.toLowerCase()
          break
        default: // date
          aValue = new Date(a.invoice_date)
          bValue = new Date(b.invoice_date)
      }
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
    
    return filtered
  }, [invoices, searchTerm, sortBy, sortOrder, filterBy])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortBy, sortOrder, filterBy])

  // Calculate pagination
  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage)
  const startIndex = (currentPage - 1) * invoicesPerPage
  const currentInvoices = filteredInvoices.slice(startIndex, startIndex + invoicesPerPage)

  const fetchData = async () => {
    try {
      console.log("[v0] Iniciando fetchData...")

      // Fetch invoices with appointment and client details
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select(`
          *,
          appointments (
            id,
            appointment_date,
            clients (first_name, last_name),
            services (name, price)
          )
        `)
        .order("invoice_date", { ascending: false })

      console.log("[v0] Invoices data:", invoicesData)

      const { data: allAppointments } = await supabase.from("appointments").select(`
          *,
          clients (id, first_name, last_name),
          services (id, name, price)
        `)

      console.log("[v0] All appointments:", allAppointments)
      console.log(
        "[v0] Appointment statuses:",
        allAppointments?.map((a) => a.status),
      )

      let appointmentsQuery = supabase
        .from("appointments")
        .select(`
          *,
          clients (id, first_name, last_name),
          services (id, name, price)
        `)
        .eq("status", "completed")

      // Si hay facturas existentes, excluir esas citas usando la sintaxis correcta de Supabase
      if (invoicesData && invoicesData.length > 0) {
        const invoicedAppointmentIds = invoicesData.map((inv) => inv.appointment_id)
        console.log("[v0] Invoiced appointment IDs to exclude:", invoicedAppointmentIds)

        if (invoicedAppointmentIds.length === 1) {
          appointmentsQuery = appointmentsQuery.neq("id", invoicedAppointmentIds[0])
        } else {
          appointmentsQuery = appointmentsQuery.not("id", "in", `(${invoicedAppointmentIds.join(",")})`)
        }
      }

      const { data: appointmentsData, error: appointmentsError } = await appointmentsQuery

      if (appointmentsError) {
        console.error("Error fetching completed appointments:", appointmentsError)
        toast({
          title: "Error",
          description: "Error al cargar citas completadas",
          variant: "destructive",
        })
      }

      console.log("[v0] Completed appointments:", appointmentsData)

      // Fetch services for invoice items
      const { data: servicesData } = await supabase.from("services").select("*").order("name")

      setInvoices(invoicesData || [])
      setCompletedAppointments(appointmentsData || [])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAppointment) {
      toast({
        title: "Error",
        description: "Selecciona una cita",
        variant: "destructive",
      })
      return
    }

    // Validar que el monto pagado sea mayor o igual al total
    const totalAmount = Number.parseFloat(formData.total_amount)
    const paidAmount = Number.parseFloat(formData.paid_amount)
    
    if (paidAmount < totalAmount) {
      toast({
        title: "Error",
        description: "El monto pagado debe ser mayor o igual al total de la factura",
        variant: "destructive",
      })
      return
    }

    try {
      // Use the RPC function to save invoice with items atomically
      const { data, error } = await supabase.rpc("save_invoice_with_items", {
        p_appointment_id: Number.parseInt(selectedAppointment),
        p_total_amount: Number.parseFloat(formData.total_amount),
        p_paid_amount: Number.parseFloat(formData.paid_amount),
        p_change_amount: Number.parseFloat(formData.change_amount),
        p_late_fee: Number.parseFloat(formData.late_fee),
        p_discount: Number.parseFloat(formData.discount),
        p_notes: formData.notes || null,
        p_items: invoiceItems,
      })

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Factura creada correctamente",
      })

      const shouldPrint = confirm("¿Deseas imprimir la factura ahora?")
      if (shouldPrint) {
        // Buscar la factura recién creada para imprimirla
        setTimeout(async () => {
          const { data: newInvoice } = await supabase
            .from("invoices")
            .select(`
              *,
              appointments (
                id,
                appointment_date,
                clients (first_name, last_name),
                services (name, price)
              )
            `)
            .eq("appointment_id", Number.parseInt(selectedAppointment))
            .order("invoice_date", { ascending: false })
            .limit(1)
            .single()

          if (newInvoice) {
            printInvoice(newInvoice)
          }
        }, 500)
      }

      setDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error saving invoice:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la factura",
        variant: "destructive",
      })
    }
  }

  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
        service_name: "",
        unit_price: 0,
        quantity: 1,
        line_total: 0,
      },
    ])
  }

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoiceItems]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-calculate line total
    if (field === "unit_price" || field === "quantity") {
      newItems[index].line_total = newItems[index].unit_price * newItems[index].quantity
    }

    setInvoiceItems(newItems)

    // Update total amount
    const subtotal = newItems.reduce((sum, item) => sum + item.line_total, 0)
    const total = subtotal + Number.parseFloat(formData.late_fee) - Number.parseFloat(formData.discount)
    setFormData((prev) => ({ ...prev, total_amount: total.toString() }))
  }

  const removeInvoiceItem = (index: number) => {
    const newItems = invoiceItems.filter((_, i) => i !== index)
    setInvoiceItems(newItems)

    // Update total amount
    const subtotal = newItems.reduce((sum, item) => sum + item.line_total, 0)
    const total = subtotal + Number.parseFloat(formData.late_fee) - Number.parseFloat(formData.discount)
    setFormData((prev) => ({ ...prev, total_amount: total.toString() }))
  }

  const resetForm = () => {
    setFormData({
      total_amount: "0",
      paid_amount: "0",
      change_amount: "0",
      late_fee: "0",
      discount: "0",
      notes: "",
    })
    setSelectedAppointment("")
    setInvoiceItems([])
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta factura?")) return

    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Factura eliminada correctamente",
      })
      fetchData()
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la factura",
        variant: "destructive",
      })
    }
  }

  const printInvoice = (invoice: InvoiceWithDetails) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const invoiceDate = new Date(invoice.invoice_date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const appointmentDate = new Date(invoice.appointments.appointment_date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    // Calcular subtotal (total - recargo + descuento)
    const subtotal = invoice.total_amount - invoice.late_fee + invoice.discount
    const apartado = 0 // Por ahora en 0, se puede agregar campo después

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Factura #${invoice.id}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 3mm;
              }
            }
            
            body {
              font-family: 'Arial', sans-serif;
              font-size: 11px;
              line-height: 1.4;
              width: 74mm;
              margin: 0 auto;
              padding: 3mm;
              background: white;
              color: #000;
            }
            
            .header {
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
            }
            
            .business-name {
              font-size: 16px;
              font-weight: bold;
              letter-spacing: 1px;
              margin-bottom: 2px;
            }
            
            .business-subtitle {
              font-size: 10px;
              color: #666;
              margin-bottom: 4px;
            }
            
            .invoice-info {
              margin: 8px 0;
              background: #f8f8f8;
              padding: 6px;
              border-radius: 3px;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
              font-size: 10px;
            }
            
            .info-label {
              font-weight: bold;
              color: #333;
            }
            
            .client-info {
              margin: 8px 0;
              padding: 6px;
              border: 1px solid #ddd;
              border-radius: 3px;
            }
            
            .client-name {
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 2px;
            }
            
            .section-header {
              text-align: center;
              font-weight: bold;
              font-size: 11px;
              margin: 10px 0 6px 0;
              padding: 4px 0;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              background: #f0f0f0;
            }
            
            .service-item {
              margin: 6px 0;
              padding: 4px;
              border-left: 3px solid #007acc;
              background: #f9f9f9;
            }
            
            .service-name {
              font-weight: bold;
              font-size: 11px;
              margin-bottom: 2px;
            }
            
            .service-details {
              font-size: 10px;
              color: #666;
              display: flex;
              justify-content: space-between;
            }
            
            .calculations {
              margin-top: 8px;
              border-top: 1px solid #000;
              padding-top: 6px;
            }
            
            .calc-line {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
              font-size: 10px;
            }
            
            .calc-line.subtotal {
              border-top: 1px dashed #666;
              padding-top: 3px;
              margin-top: 6px;
            }
            
            .calc-line.total {
              font-weight: bold;
              font-size: 12px;
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              padding: 4px 0;
              margin: 6px 0;
              background: #f0f0f0;
            }
            
            .payment-info {
              margin-top: 8px;
              padding: 6px;
              background: #f8f8f8;
              border-radius: 3px;
            }
            
            .payment-line {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
              font-size: 11px;
            }
            
            .payment-line.change {
              font-weight: bold;
              color: #007acc;
            }
            
            .footer {
              text-align: center;
              margin-top: 12px;
              padding-top: 8px;
              border-top: 2px solid #000;
              font-size: 10px;
            }
            
            .thanks {
              font-weight: bold;
              margin-bottom: 4px;
            }
            
            .contact {
              color: #666;
              font-size: 9px;
            }
            
            .highlight {
              background: #ffffcc;
              padding: 2px;
            }
            
            .negative {
              color: #d32f2f;
            }
            
            .positive {
              color: #388e3c;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">LUCERO GLAM STUDIO</div>
            <div class="business-subtitle">Centro de Belleza y Estética</div>
          </div>
          
          <div class="invoice-info">
            <div class="info-row">
              <span class="info-label">FACTURA N°:</span>
              <span class="highlight">#${String(invoice.id).padStart(6, '0')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">FECHA:</span>
              <span>${invoiceDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">FECHA CITA:</span>
              <span>${appointmentDate}</span>
            </div>
          </div>
          
          <div class="client-info">
            <div class="client-name">CLIENTE:</div>
            <div>${invoice.appointments.clients.first_name} ${invoice.appointments.clients.last_name}</div>
          </div>
          
          <div class="section-header">SERVICIOS REALIZADOS</div>
          
          <div class="service-item">
            <div class="service-name">${invoice.appointments.services.name}</div>
            <div class="service-details">
              <span>1 unidad × $${invoice.appointments.services.price.toFixed(2)}</span>
              <span class="positive">$${invoice.appointments.services.price.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="calculations">
            <div class="calc-line subtotal">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            
            ${apartado > 0 ? `
            <div class="calc-line">
              <span>Apartado:</span>
              <span class="negative">-$${apartado.toFixed(2)}</span>
            </div>` : ''}
            
            ${invoice.late_fee > 0 ? `
            <div class="calc-line">
              <span>Recargo por mora:</span>
              <span class="negative">+$${invoice.late_fee.toFixed(2)}</span>
            </div>` : ''}
            
            ${invoice.discount > 0 ? `
            <div class="calc-line">
              <span>Descuento aplicado:</span>
              <span class="positive">-$${invoice.discount.toFixed(2)}</span>
            </div>` : ''}
            
            <div class="calc-line total">
              <span>TOTAL A PAGAR:</span>
              <span>$${invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <div class="payment-line">
              <span>Pagado con:</span>
              <span>$${invoice.paid_amount.toFixed(2)}</span>
            </div>
            
            ${invoice.change_amount > 0 ? `
            <div class="payment-line change">
              <span>Su cambio:</span>
              <span>$${invoice.change_amount.toFixed(2)}</span>
            </div>` : ''}
          </div>
          
          ${invoice.notes ? `
          <div style="margin-top: 8px; padding: 4px; border: 1px dashed #666; font-size: 9px;">
            <strong>Notas:</strong> ${invoice.notes}
          </div>` : ''}
          
          <div class="footer">
            <div class="thanks">¡GRACIAS POR CONFIAR EN NOSOTROS!</div>
            <div class="contact">
              📍 Calle Francisco Richez #44, La Romana, Plaza Artesanal<br>
              📞 Tel: +1 849-532-0716<br>
              💄 Su belleza es nuestra pasión
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-2xl font-bold">Gestión de Facturas</h2>
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
        <h2 className="text-2xl font-bold">Gestión de Facturas</h2>
      </div>

      {/* Billing Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Facturas</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                <p className="text-2xl font-bold">
                  ${invoices.reduce((sum, inv) => sum + inv.total_amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Promedio por Factura</p>
                <p className="text-2xl font-bold">
                  ${invoices.length > 0 ? (invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Este Mes</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const thisMonth = new Date()
                    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
                    return invoices.filter(inv => new Date(inv.invoice_date) >= monthStart).length
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, servicio o número de factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las facturas</SelectItem>
            <SelectItem value="recent">Últimos 7 días</SelectItem>
            <SelectItem value="month">Último mes</SelectItem>
            <SelectItem value="high">Monto alto (&gt;$100)</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
          const [field, order] = value.split('-')
          setSortBy(field)
          setSortOrder(order as 'asc' | 'desc')
        }}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpNarrowWide className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Fecha (más reciente)</SelectItem>
            <SelectItem value="date-asc">Fecha (más antigua)</SelectItem>
            <SelectItem value="amount-desc">Monto (mayor)</SelectItem>
            <SelectItem value="amount-asc">Monto (menor)</SelectItem>
            <SelectItem value="client-asc">Cliente (A-Z)</SelectItem>
            <SelectItem value="client-desc">Cliente (Z-A)</SelectItem>
            <SelectItem value="service-asc">Servicio (A-Z)</SelectItem>
            <SelectItem value="service-desc">Servicio (Z-A)</SelectItem>
          </SelectContent>
        </Select>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Factura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-7xl min-w-[80vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Factura</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="appointment_id">Cita Completada</Label>
                <Select value={selectedAppointment} onValueChange={setSelectedAppointment}>
                  <SelectTrigger id="appointment_id">
                    <SelectValue placeholder="Seleccionar cita" />
                  </SelectTrigger>
                  <SelectContent>
                    {completedAppointments.map((appointment) => (
                      <SelectItem key={appointment.id} value={appointment.id.toString()}>
                        {appointment.clients?.first_name} {appointment.clients?.last_name} -{" "}
                        {appointment.services?.name} ({new Date(appointment.appointment_date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {completedAppointments.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No hay citas completadas disponibles para facturar
                  </p>
                )}
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Servicios Facturados</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem}>
                    Agregar Servicio
                  </Button>
                </div>

                {/* Headers for the grid */}
                {invoiceItems.length > 0 && (
                  <div className="hidden sm:grid grid-cols-12 gap-4 mb-3 px-4 text-sm font-medium text-muted-foreground">
                    <div className="col-span-4">Servicio</div>
                    <div className="col-span-2">Precio Unit.</div>
                    <div className="col-span-2">Cantidad</div>
                    <div className="col-span-3">Total</div>
                    <div className="col-span-1">Acción</div>
                  </div>
                )}

                {invoiceItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 border rounded-lg bg-muted/30">
                    <div className="col-span-4">
                      <Select
                        value={item.service_id?.toString() || ""}
                        onValueChange={(value) => {
                          const service = services.find((s) => s.id.toString() === value)
                          if (service) {
                            updateInvoiceItem(index, "service_id", service.id)
                            updateInvoiceItem(index, "service_name", service.name)
                            updateInvoiceItem(index, "unit_price", service.price)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Servicio" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.name} - ${service.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Precio"
                        value={item.unit_price}
                        onChange={(e) => updateInvoiceItem(index, "unit_price", Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" step="0.01" placeholder="Total" value={item.line_total} readOnly />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="outline" size="icon" onClick={() => removeInvoiceItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="late_fee">Recargo por Demora</Label>
                  <Input
                    id="late_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.late_fee}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setFormData({ ...formData, late_fee: newValue })
                      // Recalculate total
                      const subtotal = invoiceItems.reduce((sum, item) => sum + item.line_total, 0)
                      const total = subtotal + Number.parseFloat(newValue) - Number.parseFloat(formData.discount)
                      setFormData((prev) => ({ ...prev, late_fee: newValue, total_amount: total.toString() }))
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="discount">Descuento</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setFormData({ ...formData, discount: newValue })
                      // Recalculate total
                      const subtotal = invoiceItems.reduce((sum, item) => sum + item.line_total, 0)
                      const total = subtotal + Number.parseFloat(formData.late_fee) - Number.parseFloat(newValue)
                      setFormData((prev) => ({ ...prev, discount: newValue, total_amount: total.toString() }))
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="total_amount">Total</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    readOnly
                    className="font-semibold"
                  />
                </div>

                <div>
                  <Label htmlFor="paid_amount">Monto Pagado</Label>
                  <Input
                    id="paid_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.paid_amount}
                    onChange={(e) => {
                      const paid = Number.parseFloat(e.target.value) || 0
                      const total = Number.parseFloat(formData.total_amount) || 0
                      const change = Math.max(0, paid - total)
                      setFormData({
                        ...formData,
                        paid_amount: e.target.value,
                        change_amount: change.toString(),
                      })
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="change_amount">Cambio</Label>
                  <Input id="change_amount" type="number" step="0.01" value={formData.change_amount} readOnly />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Crear Factura
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Results count badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Receipt className="h-3 w-3" />
          {filteredInvoices.length} {filteredInvoices.length === 1 ? 'factura' : 'facturas'}
        </Badge>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("")
              setFilterBy("all")
            }}
            className="h-6 px-2 text-xs"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {currentInvoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Factura #{invoice.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {invoice.appointments.clients.first_name} {invoice.appointments.clients.last_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </div>
                    <span>Servicio: {invoice.appointments.services.name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Total: ${invoice.total_amount}
                    </span>
                    <span>Pagado: ${invoice.paid_amount}</span>
                    {invoice.change_amount > 0 && <span>Cambio: ${invoice.change_amount}</span>}
                    {invoice.late_fee > 0 && <Badge variant="destructive">Recargo: ${invoice.late_fee}</Badge>}
                    {invoice.discount > 0 && <Badge variant="secondary">Descuento: ${invoice.discount}</Badge>}
                  </div>

                  {invoice.notes && <p className="text-sm text-muted-foreground mt-2">{invoice.notes}</p>}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => printInvoice(invoice)} title="Imprimir factura">
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(invoice.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm || filterBy !== "all" ? "No se encontraron facturas" : "No hay facturas registradas"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || filterBy !== "all" 
                ? "Intenta ajustar los filtros de búsqueda" 
                : "Crea tu primera factura para comenzar"}
            </p>
            {(searchTerm || filterBy !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setFilterBy("all")
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {invoices.length > invoicesPerPage && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + invoicesPerPage, invoices.length)} de {invoices.length} facturas
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {invoices.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay facturas registradas</h3>
              <p className="text-muted-foreground">Las facturas aparecerán aquí cuando completes citas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
