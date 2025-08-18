-- Script para limpiar funciones duplicadas y crear la función correcta

-- Paso 1: Eliminar TODAS las versiones de la función
DROP FUNCTION IF EXISTS public.save_invoice_with_items CASCADE;
DROP FUNCTION IF EXISTS public.save_invoice_with_items_17487 CASCADE;
DROP FUNCTION IF EXISTS public.save_invoice_with_items_23610 CASCADE;

-- Paso 2: Eliminar cualquier otra versión que pueda existir
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT specific_name 
        FROM information_schema.routines 
        WHERE routine_name LIKE '%save_invoice_with_items%' 
        AND routine_schema = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_record.specific_name || ' CASCADE';
    END LOOP;
END $$;

-- Paso 3: Verificar que la columna payment_method existe
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS payment_method text;

-- Paso 4: Crear la función limpia y correcta
CREATE FUNCTION public.save_invoice_with_items(
  p_appointment_id bigint,
  p_total_amount numeric,
  p_paid_amount numeric,
  p_change_amount numeric,
  p_late_fee numeric default 0,
  p_discount numeric default 0,
  p_notes text default null,
  p_payment_method text default null,
  p_items jsonb default '[]'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  v_invoice_id bigint;
  v_item jsonb;
BEGIN
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
    RAISE;
END;
$$;