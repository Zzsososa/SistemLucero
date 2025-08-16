-- ============================================
-- Script de diagnóstico completo para Supabase
-- Ejecutar paso a paso en Supabase SQL Editor
-- ============================================

-- PASO 1: Verificar que todas las tablas existen
SELECT 'PASO 1: Verificación de tablas' as diagnostico;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'services', 'appointments', 'invoices', 'invoice_items')
ORDER BY table_name;

-- PASO 2: Verificar el estado de RLS en cada tabla
SELECT 'PASO 2: Estado de Row Level Security' as diagnostico;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS HABILITADO' 
        ELSE 'RLS DESHABILITADO' 
    END as estado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'services', 'appointments', 'invoices', 'invoice_items')
ORDER BY tablename;

-- PASO 3: Verificar políticas existentes
SELECT 'PASO 3: Políticas RLS existentes' as diagnostico;
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual = 'true' THEN 'ACCESO TOTAL'
        ELSE 'ACCESO RESTRINGIDO'
    END as tipo_acceso
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('clients', 'services', 'appointments', 'invoices', 'invoice_items')
ORDER BY tablename, policyname;

-- PASO 4: Contar registros en cada tabla
SELECT 'PASO 4: Conteo de registros' as diagnostico;
SELECT 'clients' as tabla, count(*) as total_registros FROM public.clients
UNION ALL
SELECT 'services' as tabla, count(*) as total_registros FROM public.services
UNION ALL
SELECT 'appointments' as tabla, count(*) as total_registros FROM public.appointments
UNION ALL
SELECT 'invoices' as tabla, count(*) as total_registros FROM public.invoices
UNION ALL
SELECT 'invoice_items' as tabla, count(*) as total_registros FROM public.invoice_items
ORDER BY tabla;

-- PASO 5: Probar consultas específicas que fallan en el dashboard
SELECT 'PASO 5: Prueba de consultas del dashboard' as diagnostico;

-- Consulta 1: Total de clientes (como en el dashboard)
SELECT 'Consulta clientes' as prueba, count(*) as resultado
FROM public.clients;

-- Consulta 2: Citas de hoy (simulando la fecha actual)
SELECT 'Citas de hoy' as prueba, count(*) as resultado
FROM public.appointments 
WHERE appointment_date >= CURRENT_DATE 
AND appointment_date < CURRENT_DATE + INTERVAL '1 day';

-- Consulta 3: Citas pendientes
SELECT 'Citas pendientes' as prueba, count(*) as resultado
FROM public.appointments 
WHERE status = 'scheduled';

-- Consulta 4: Facturas del mes actual
SELECT 'Facturas mes actual' as prueba, count(*) as resultado
FROM public.invoices 
WHERE invoice_date >= date_trunc('month', CURRENT_DATE)
AND invoice_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';

-- PASO 6: Verificar permisos de usuario anónimo
SELECT 'PASO 6: Información del usuario actual' as diagnostico;
SELECT 
    current_user as usuario_actual,
    session_user as usuario_sesion,
    current_setting('role') as rol_actual;

-- PASO 7: Si hay problemas, recrear políticas desde cero
SELECT 'PASO 7: Comandos para recrear políticas (ejecutar si es necesario)' as diagnostico;

-- Desactivar RLS temporalmente para pruebas (SOLO PARA DESARROLLO)
-- ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.invoice_items DISABLE ROW LEVEL SECURITY;

-- O mantener RLS pero con políticas completamente abiertas
/*
DROP POLICY IF EXISTS "Enable all access for clients" ON public.clients;
DROP POLICY IF EXISTS "Enable all access for services" ON public.services;
DROP POLICY IF EXISTS "Enable all access for appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable all access for invoices" ON public.invoices;
DROP POLICY IF EXISTS "Enable all access for invoice_items" ON public.invoice_items;

CREATE POLICY "Allow all for clients" ON public.clients FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for services" ON public.services FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for appointments" ON public.appointments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for invoices" ON public.invoices FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for invoice_items" ON public.invoice_items FOR ALL TO public USING (true) WITH CHECK (true);
*/