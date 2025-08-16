"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, User, Phone, Search, AlertCircle, Filter, SortAsc, SortDesc, Users, TrendingUp, Clock, Star, ChevronLeft, ChevronRight } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { supabase, type Client } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export function ClientsManager() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "date" | "phone">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [filterBy, setFilterBy] = useState<"all" | "recent">("all")
  const { toast } = useToast()

  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const clientsPerPage = 5

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    description: "",
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchClients()
  }, [])

  // Resetear a la primera página cuando cambien filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortBy, sortOrder, filterBy])

  useEffect(() => {
    let filtered = clients.filter((client) => {
      // Filtro de búsqueda por texto
      const matchesSearch = searchTerm === "" || 
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone_number.includes(searchTerm)

      // Filtros adicionales
      let matchesFilter = true
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      switch (filterBy) {
        case "recent":
          matchesFilter = new Date(client.created_at) >= thirtyDaysAgo
          break
        default:
          matchesFilter = true
      }

      return matchesSearch && matchesFilter
    })

    // Ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "name":
          comparison = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
          break
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "phone":
          comparison = a.phone_number.localeCompare(b.phone_number)
          break
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })

    setFilteredClients(filtered)
  }, [clients, searchTerm, sortBy, sortOrder, filterBy])

  // Cálculo de paginación
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / clientsPerPage))
  const startIndex = (currentPage - 1) * clientsPerPage
  const currentClients = filteredClients.slice(startIndex, startIndex + clientsPerPage)

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from("clients").select("*").order("first_name")

      if (error) throw error

      setClients(data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Validación de nombre
    if (!formData.first_name.trim()) {
      errors.first_name = "El nombre es requerido"
    } else if (formData.first_name.trim().length < 2) {
      errors.first_name = "El nombre debe tener al menos 2 caracteres"
    } else if (formData.first_name.trim().length > 50) {
      errors.first_name = "El nombre no puede exceder 50 caracteres"
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.first_name.trim())) {
      errors.first_name = "El nombre solo puede contener letras y espacios"
    }

    // Validación de apellido
    if (!formData.last_name.trim()) {
      errors.last_name = "El apellido es requerido"
    } else if (formData.last_name.trim().length < 2) {
      errors.last_name = "El apellido debe tener al menos 2 caracteres"
    } else if (formData.last_name.trim().length > 50) {
      errors.last_name = "El apellido no puede exceder 50 caracteres"
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.last_name.trim())) {
      errors.last_name = "El apellido solo puede contener letras y espacios"
    }

    // Validación de teléfono
    if (!formData.phone_number.trim()) {
      errors.phone_number = "El teléfono es requerido"
    } else {
      const phoneClean = formData.phone_number.replace(/[\s\-()]/g, '')
      if (!/^[+]?[0-9]{8,15}$/.test(phoneClean)) {
        errors.phone_number = "El teléfono debe tener entre 8 y 15 dígitos"
      }
    }



    // Validación de descripción
    if (formData.description && formData.description.trim().length > 500) {
      errors.description = "La descripción no puede exceder 500 caracteres"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar formulario
    if (!validateForm()) {
      toast({
        title: "Errores en el formulario",
        description: "Por favor corrige los errores antes de continuar",
        variant: "destructive",
      })
      return
    }

    try {
      // Validar teléfono duplicado
      const existingClient = clients.find(
        (client) => 
          client.phone_number === formData.phone_number && 
          (!editingClient || client.id !== editingClient.id)
      )

      if (existingClient) {
        setFormErrors({ phone_number: "Este número ya está registrado" })
        toast({
          title: "Número de teléfono duplicado",
          description: `Ese número de teléfono ya existe con el cliente ${existingClient.first_name} ${existingClient.last_name}`,
          variant: "destructive",
        })
        return
      }



      // Limpiar datos antes de enviar
      const cleanedData = {
        ...formData,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: formData.phone_number.trim(),
        description: formData.description.trim() || null,
      }

      if (editingClient) {
        const { error } = await supabase.from("clients").update(cleanedData).eq("id", editingClient.id)

        if (error) throw error

        toast({
          title: "Éxito",
          description: "Cliente actualizado correctamente",
        })
      } else {
        const { error } = await supabase.from("clients").insert([cleanedData])

        if (error) throw error

        toast({
          title: "Éxito",
          description: "Cliente creado correctamente",
        })
      }

      setDialogOpen(false)
      resetForm()
      fetchClients()
    } catch (error: any) {
      console.error("Error saving client:", error)
      
      // Manejar errores específicos de Supabase
      let errorMessage = "No se pudo guardar el cliente"
      
      if (error?.code === '23505') {
        // Error de restricción única
        if (error.message?.includes('phone_number')) {
          errorMessage = "Ya existe un cliente con este número de teléfono"
          setFormErrors({ phone_number: 'Este número de teléfono ya está registrado' })
        } else {
          errorMessage = "Ya existe un cliente con estos datos"
        }
      } else if (error?.code === '23514') {
        // Error de restricción de verificación
        errorMessage = "Los datos proporcionados no cumplen con los requisitos"
      } else if (error?.code === '23502') {
        // Error de campo requerido
        errorMessage = "Faltan campos requeridos"
      } else if (error?.code === 'PGRST116') {
        // Error de conexión
        errorMessage = "Error de conexión. Verifica tu conexión a internet."
      } else if (error?.message?.includes('JWT')) {
        // Error de autenticación
        errorMessage = "Sesión expirada. Por favor, recarga la página."
      } else if (error?.message?.includes('permission')) {
        // Error de permisos
        errorMessage = "No tienes permisos para realizar esta acción"
      } else if (error?.message) {
        errorMessage = `Error al guardar el cliente: ${error.message}`
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      phone_number: client.phone_number,
      description: client.description || "",
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) return

    try {
      const { error } = await supabase.from("clients").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Cliente eliminado correctamente",
      })
      fetchClients()
    } catch (error) {
      console.error("Error deleting client:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      phone_number: "",
      description: "",
    })
    setFormErrors({})
    setTouchedFields({})
    setEditingClient(null)
  }

  const validateField = (fieldName: string, value: string) => {
    const errors: { [key: string]: string } = {}

    switch (fieldName) {
      case 'first_name':
        if (!value.trim()) {
          errors.first_name = "El nombre es requerido"
        } else if (value.trim().length < 2) {
          errors.first_name = "El nombre debe tener al menos 2 caracteres"
        } else if (value.trim().length > 50) {
          errors.first_name = "El nombre no puede exceder 50 caracteres"
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value.trim())) {
          errors.first_name = "El nombre solo puede contener letras y espacios"
        }
        break

      case 'last_name':
        if (!value.trim()) {
          errors.last_name = "El apellido es requerido"
        } else if (value.trim().length < 2) {
          errors.last_name = "El apellido debe tener al menos 2 caracteres"
        } else if (value.trim().length > 50) {
          errors.last_name = "El apellido no puede exceder 50 caracteres"
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value.trim())) {
          errors.last_name = "El apellido solo puede contener letras y espacios"
        }
        break

      case 'phone_number':
        if (!value.trim()) {
          errors.phone_number = "El teléfono es requerido"
        } else {
          const phoneClean = value.replace(/[\s\-()]/g, '')
          if (!/^[+]?[0-9]{8,15}$/.test(phoneClean)) {
            errors.phone_number = "El teléfono debe tener entre 8 y 15 dígitos"
          }
        }
        break



      case 'description':
        if (value && value.trim().length > 500) {
          errors.description = "La descripción no puede exceder 500 caracteres"
        }
        break
    }

    return errors[fieldName] || ''
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    
    // Validar solo si el campo ya fue tocado
    if (touchedFields[fieldName]) {
      const fieldError = validateField(fieldName, value)
      setFormErrors(prev => ({
        ...prev,
        [fieldName]: fieldError
      }))
    }
  }

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }))
    const fieldError = validateField(fieldName, formData[fieldName as keyof typeof formData] as string)
    setFormErrors(prev => ({
      ...prev,
      [fieldName]: fieldError
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gestión de Clientes</h2>
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

  // Calcular estadísticas
  const totalClients = clients.length
  const recentClients = clients.filter(client => {
    const clientDate = new Date(client.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return clientDate >= thirtyDaysAgo
  }).length

  return (
    <div className="space-y-6">
      {/* Panel de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Nuevos (30 días)</p>
                <p className="text-2xl font-bold">{recentClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-2xl font-bold">Gestión de Clientes</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nombre *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleFieldChange('first_name', e.target.value)}
                    onBlur={() => handleFieldBlur('first_name')}
                    className={formErrors.first_name ? "border-red-500" : ""}
                    placeholder="Ingresa el nombre"
                  />
                  {formErrors.first_name && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.first_name}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="last_name">Apellido *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleFieldChange('last_name', e.target.value)}
                    onBlur={() => handleFieldBlur('last_name')}
                    className={formErrors.last_name ? "border-red-500" : ""}
                    placeholder="Ingresa el apellido"
                  />
                  {formErrors.last_name && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.last_name}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="phone_number">Teléfono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                    onBlur={() => handleFieldBlur('phone_number')}
                    className={`pl-10 ${formErrors.phone_number ? "border-red-500" : ""}`}
                    placeholder="Ej: +1 234 567 8900"
                  />
                </div>
                {formErrors.phone_number && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.phone_number}
                  </div>
                )}
              </div>



              <div>
                <Label htmlFor="description">Notas Adicionales</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  onBlur={() => handleFieldBlur('description')}
                  placeholder="Información adicional, preferencias, alergias, etc..."
                  className={`min-h-[80px] ${formErrors.description ? "border-red-500" : ""}`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  {editingClient ? "Actualizar" : "Crear"} Cliente
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar clientes por nombre, teléfono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                <SelectItem value="recent">Últimos 30 días</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="date">Fecha registro</SelectItem>
                <SelectItem value="phone">Teléfono</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="shrink-0"
            >
              {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredClients.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <User className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg mb-2">No se encontraron clientes</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterBy !== "all" 
                    ? "Intenta ajustar los filtros de búsqueda" 
                    : "Comienza agregando tu primer cliente"}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          currentClients.map((client) => {
            const age = null
            
            return (
              <Card key={client.id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Header with name and badges */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-lg">
                            {client.first_name} {client.last_name}
                          </h3>
                        </div>
                        
                        <div className="flex gap-1">
                          {age && (
                            <Badge variant="outline" className="text-xs">
                              {age} años
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Contact information */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{client.phone_number}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {client.description && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground italic">
                            "{client.description}"
                          </p>
                        </div>
                      )}

                      {/* Footer with registration date */}
                      <div className="flex items-center justify-between pt-2 border-t border-muted/30">
                        <p className="text-xs text-muted-foreground">
                          Cliente desde: {new Date(client.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                     <div className="flex flex-col gap-2 ml-4">
                       {/* Quick actions */}
                       <div className="flex gap-1 mb-2">
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => window.open(`tel:${client.phone_number}`)}
                           className="text-xs px-2 py-1 h-auto hover:bg-green-100"
                           title="Llamar"
                         >
                           <Phone className="h-3 w-3" />
                         </Button>

                       </div>
                       
                       {/* Main actions */}
                       <Button 
                         variant="outline" 
                         size="icon" 
                         onClick={() => handleEdit(client)}
                         className="hover:bg-primary/10"
                         title="Editar cliente"
                       >
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button 
                         variant="outline" 
                         size="icon" 
                         onClick={() => handleDelete(client.id)}
                         className="hover:bg-destructive/10 hover:text-destructive"
                         title="Eliminar cliente"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Controles de paginación */}
      {filteredClients.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}–{Math.min(startIndex + clientsPerPage, filteredClients.length)} de {filteredClients.length}
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
    </div>
  )
}
