-- Agregar campo payment_method a la tabla invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS payment_method text;

-- Actualizar la función RPC para incluir payment_method
CREATE OR REPLACE FUNCTION public.save_invoice_with_items(
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
    -- Si algo falla, la transacción se revierte automáticamente
    RAISE;
END;
$$;