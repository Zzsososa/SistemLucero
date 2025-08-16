import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types based on database schema
export interface Client {
  id: number
  first_name: string
  last_name: string
  phone_number: string
  description?: string
  created_at: string
}

export interface Service {
  id: number
  name: string
  description?: string
  price: number
  duration_minutes: number
}

export interface Appointment {
  id: number
  client_id: number
  service_id: number
  appointment_date: string
  deposit_amount: number
  notes?: string
  status: "scheduled" | "completed" | "cancelled"
  created_at: string
  clients?: Client
  services?: Service
}

export interface Invoice {
  id: number
  appointment_id: number
  total_amount: number
  paid_amount: number
  change_amount: number
  late_fee: number
  discount: number
  invoice_date: string
  notes?: string
}

export interface InvoiceItem {
  id: number
  invoice_id: number
  service_id?: number
  service_name: string
  unit_price: number
  quantity: number
  line_total: number
}
