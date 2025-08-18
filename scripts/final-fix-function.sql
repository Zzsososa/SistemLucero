-- Script final para corregir la función save_invoice_with_items

-- Paso 1: Verificar funciones existentes
SELECT 
    routine_name,
    specific_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'save_invoice_with_items' 
AND routine_schema = 'public';

-- Paso 2: Eliminar TODAS las versiones existentes de forma más agresiva
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Eliminar por nombre específico
    EXECUTE 'DROP FUNCTION IF EXISTS public.save_invoice_with_items CASCADE';
    
    -- Buscar y eliminar cualquier función que contenga el nombre
    FOR func_record IN 
        SELECT 
            p.proname,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname LIKE '%save_invoice_with_items%'
    LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                          func_record.proname, 
                          func_record.args);
            RAISE NOTICE 'Eliminada función: %', func_record.proname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error eliminando función %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Paso 3: Verificar que la columna payment_method existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN payment_method text;
        RAISE NOTICE 'Columna payment_method agregada';
    ELSE
        RAISE NOTICE 'Columna payment_method ya existe';
    END IF;
END $$;

-- Paso 4: Crear la función correcta con todos los parámetros
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
  RAISE NOTICE 'Método de pago: %', p_payment_method;
  
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
  
  RAISE NOTICE 'Items insertados: %', jsonb_array_length(p_items);

  -- Marcar cita como completada
  UPDATE public.appointments
    SET status = 'completed'
  WHERE id = p_appointment_id;
  
  RAISE NOTICE 'Cita marcada como completada';

  RETURN v_invoice_id;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error en save_invoice_with_items: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- Paso 5: Verificar que la función se creó correctamente
SELECT 
    routine_name,
    routine_type,
    data_type,
    pg_get_function_arguments(p.oid) as arguments
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE r.routine_name = 'save_invoice_with_items' 
AND r.routine_schema = 'public'
AND n.nspname = 'public';

-- Paso 6: Mensaje de confirmación
SELECT 'Función save_invoice_with_items actualizada correctamente con parámetro payment_method' as resultado;