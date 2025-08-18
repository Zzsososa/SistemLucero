-- Script para forzar completamente la actualización de la función

-- Paso 1: Eliminar TODAS las versiones de la función
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Buscar y eliminar todas las versiones de save_invoice_with_items
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'save_invoice_with_items' 
        AND n.nspname = 'public'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                      func_record.proname, func_record.args);
        RAISE NOTICE 'Eliminada función: %(%)', func_record.proname, func_record.args;
    END LOOP;
    
    RAISE NOTICE '=== TODAS LAS VERSIONES ELIMINADAS ===';
END $$;

-- Paso 2: Recrear la función con la firma correcta
CREATE OR REPLACE FUNCTION public.save_invoice_with_items(
  p_appointment_id bigint,
  p_change_amount numeric,
  p_discount numeric,
  p_items jsonb,
  p_late_fee numeric,
  p_notes text,
  p_paid_amount numeric,
  p_payment_method text,
  p_total_amount numeric
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  v_invoice_id bigint;
  v_item jsonb;
BEGIN
  RAISE NOTICE 'Creando factura para cita: % con método de pago: %', p_appointment_id, p_payment_method;
  
  -- Crear factura
  INSERT INTO public.invoices(
    appointment_id, total_amount, paid_amount, change_amount, 
    late_fee, discount, notes, payment_method
  )
  VALUES (
    p_appointment_id, p_total_amount, p_paid_amount, p_change_amount, 
    p_late_fee, p_discount, p_notes, p_payment_method
  )
  RETURNING id INTO v_invoice_id;
  
  RAISE NOTICE 'Factura creada con ID: %', v_invoice_id;

  -- Insertar ítems de la factura
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.invoice_items(
      invoice_id, service_id, service_name, unit_price, quantity, line_total
    )
    VALUES (
      v_invoice_id,
      CASE 
        WHEN (v_item->>'service_id') = '' OR (v_item->>'service_id') IS NULL 
        THEN NULL 
        ELSE (v_item->>'service_id')::bigint 
      END,
      (v_item->>'service_name'),
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::int,
      (v_item->>'line_total')::numeric
    );
  END LOOP;

  -- Marcar cita como completada
  UPDATE public.appointments
    SET status = 'completed'
  WHERE id = p_appointment_id;

  RAISE NOTICE 'Factura completada exitosamente';
  RETURN v_invoice_id;
  
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error en save_invoice_with_items: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- Paso 3: Verificar la nueva función
SELECT 
    'FUNCIÓN RECREADA' as status,
    routine_name,
    pg_get_function_arguments(p.oid) as signature
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE r.routine_name = 'save_invoice_with_items' 
AND r.routine_schema = 'public'
AND n.nspname = 'public';

-- Paso 4: Forzar actualizaciones de caché
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SELECT pg_notify('pgrst', 'reload schema');

-- Paso 5: Mensaje final
DO $$
BEGIN
    RAISE NOTICE '=== FUNCIÓN RECREADA COMPLETAMENTE ===';
    RAISE NOTICE 'La función save_invoice_with_items ahora tiene 9 parámetros en el orden correcto';
    RAISE NOTICE 'Parámetros: p_appointment_id, p_change_amount, p_discount, p_items, p_late_fee, p_notes, p_paid_amount, p_payment_method, p_total_amount';
END $$;