-- ============================================
-- Script para corregir políticas RLS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Primero, verificar que todas las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'services', 'appointments', 'invoices', 'invoice_items');

-- Eliminar políticas existentes si hay conflictos
DROP POLICY IF EXISTS "Enable all access for clients" ON public.clients;
DROP POLICY IF EXISTS "Enable all access for services" ON public.services;
DROP POLICY IF EXISTS "Enable all access for appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable all access for invoices" ON public.invoices;
DROP POLICY IF EXISTS "Enable all access for invoice_items" ON public.invoice_items;

-- Habilitar RLS en todas las tablas
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para desarrollo
CREATE POLICY "Enable all access for clients" ON public.clients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for services" ON public.services
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for appointments" ON public.appointments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for invoices" ON public.invoices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for invoice_items" ON public.invoice_items
  FOR ALL USING (true) WITH CHECK (true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('clients', 'services', 'appointments', 'invoices', 'invoice_items');

-- Verificar que hay datos en las tablas principales
SELECT 'clients' as tabla, count(*) as registros FROM public.clients
UNION ALL
SELECT 'services' as tabla, count(*) as registros FROM public.services
UNION ALL
SELECT 'appointments' as tabla, count(*) as registros FROM public.appointments
UNION ALL
SELECT 'invoices' as tabla, count(*) as registros FROM public.invoices;