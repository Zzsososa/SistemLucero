-- Script para probar la función save_invoice_with_items

-- Verificar que la función existe y tiene los parámetros correctos
SELECT 
    routine_name,
    routine_type,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE r.routine_name = 'save_invoice_with_items' 
AND r.routine_schema = 'public'
AND n.nspname = 'public';

-- Verificar que las tablas tienen las columnas necesarias
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('invoices', 'invoice_items', 'appointments')
AND column_name IN ('payment_method', 'appointment_id', 'service_name', 'unit_price', 'quantity', 'line_total')
ORDER BY table_name, column_name;

-- Verificar que hay datos de prueba disponibles
SELECT 
    'appointments' as tabla,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completadas
FROM public.appointments
UNION ALL
SELECT 
    'clients' as tabla,
    COUNT(*) as total,
    0 as completadas
FROM public.clients
UNION ALL
SELECT 
    'services' as tabla,
    COUNT(*) as total,
    0 as completadas
FROM public.services;

-- Probar la función con datos de ejemplo (si existen citas)
DO $$
DECLARE
    test_appointment_id bigint;
    result_id bigint;
BEGIN
    -- Buscar una cita que no tenga factura
    SELECT a.id INTO test_appointment_id
    FROM public.appointments a
    LEFT JOIN public.invoices i ON i.appointment_id = a.id
    WHERE i.id IS NULL
    AND a.status = 'completed'
    LIMIT 1;
    
    IF test_appointment_id IS NOT NULL THEN
        RAISE NOTICE 'Probando función con cita ID: %', test_appointment_id;
        
        -- Probar la función
        SELECT public.save_invoice_with_items(
            test_appointment_id,
            100.00,
            100.00,
            0.00,
            0.00,
            0.00,
            'Factura de prueba',
            'Cash',
            '[{"service_name": "Servicio de prueba", "unit_price": 100, "quantity": 1, "line_total": 100}]'::jsonb
        ) INTO result_id;
        
        RAISE NOTICE 'Función ejecutada exitosamente. ID de factura: %', result_id;
        
        -- Limpiar la factura de prueba
        DELETE FROM public.invoice_items WHERE invoice_id = result_id;
        DELETE FROM public.invoices WHERE id = result_id;
        
        RAISE NOTICE 'Factura de prueba eliminada';
    ELSE
        RAISE NOTICE 'No se encontraron citas disponibles para probar';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en la prueba: % - %', SQLSTATE, SQLERRM;
END $$;