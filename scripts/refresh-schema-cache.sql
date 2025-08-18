-- Script para refrescar el schema cache de Supabase

-- Paso 1: Verificar que la función existe
SELECT 
    routine_name,
    routine_type,
    pg_get_function_arguments(p.oid) as arguments
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE r.routine_name = 'save_invoice_with_items' 
AND r.routine_schema = 'public'
AND n.nspname = 'public';

-- Paso 2: Refrescar el cache recreando la función
DROP FUNCTION IF EXISTS public.save_invoice_with_items CASCADE;

-- Paso 3: Recrear la función exactamente como debe ser
CREATE OR REPLACE FUNCTION public.save_invoice_with_items(
  p_appointment_id bigint,
  p_total_amount numeric,
  p_paid_amount numeric,
  p_change_amount numeric,
  p_late_fee numeric DEFAULT 0,
  p_discount numeric DEFAULT 0,
  p_notes text DEFAULT null,
  p_payment_method text DEFAULT null,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  v_invoice_id bigint;
  v_item jsonb;
BEGIN
  RAISE NOTICE 'Iniciando creación de factura para cita: %', p_appointment_id;
  
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

  RETURN v_invoice_id;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error en save_invoice_with_items: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- Paso 4: Verificar que la función se creó correctamente
SELECT 
    'Función recreada exitosamente' as status,
    routine_name,
    pg_get_function_arguments(p.oid) as arguments
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE r.routine_name = 'save_invoice_with_items' 
AND r.routine_schema = 'public'
AND n.nspname = 'public';

-- Paso 5: Forzar actualización del cache
NOTIFY pgrst, 'reload schema';