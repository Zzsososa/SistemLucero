-- ============================================
-- Lucero Glam Studio - Esquema Base Supabase
-- PostgreSQL compatible (Supabase)
-- ============================================

-- ============================================
-- 1) ENUMS
-- ============================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type appointment_status as enum ('scheduled', 'completed', 'cancelled');
  end if;
end$$;

-- ============================================
-- 2) TABLAS
-- ============================================

-- clients
create table if not exists public.clients (
  id                bigserial primary key,
  first_name        text not null,
  last_name         text not null,
  phone_number      text not null,
  description       text,
  created_at        timestamptz not null default now(),
  constraint uq_clients_phone unique (phone_number)
);

-- services
create table if not exists public.services (
  id                bigserial primary key,
  name              text not null,
  description       text,
  price             numeric(12,2) not null check (price >= 0),
  duration_minutes  integer not null check (duration_minutes > 0),
  constraint uq_services_name unique (name)
);

-- appointments
create table if not exists public.appointments (
  id                bigserial primary key,
  client_id         bigint not null references public.clients(id) on delete restrict,
  service_id        bigint not null references public.services(id) on delete restrict,
  appointment_date  timestamptz not null,
  deposit_amount    numeric(12,2) not null default 0 check (deposit_amount >= 0),
  notes             text,
  status            appointment_status not null default 'scheduled',
  created_at        timestamptz not null default now()
);

-- invoices (encabezado)
create table if not exists public.invoices (
  id             bigserial primary key,
  appointment_id bigint not null references public.appointments(id) on delete restrict,
  total_amount   numeric(12,2) not null check (total_amount >= 0),
  paid_amount    numeric(12,2) not null check (paid_amount >= 0),
  change_amount  numeric(12,2) not null check (change_amount >= 0),
  late_fee       numeric(12,2) not null default 0 check (late_fee >= 0),
  discount       numeric(12,2) not null default 0 check (discount >= 0),
  invoice_date   timestamptz not null default now(),
  notes          text
);

-- invoice_items (detalle multi-servicio)
create table if not exists public.invoice_items (
  id            bigserial primary key,
  invoice_id    bigint not null references public.invoices(id) on delete cascade,
  service_id    bigint references public.services(id) on delete set null,
  service_name  text not null,
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0),
  line_total    numeric(12,2) not null check (line_total >= 0)
);

-- payments (uso futuro)
create table if not exists public.payments (
  id             bigserial primary key,
  appointment_id bigint references public.appointments(id) on delete restrict,
  amount         numeric(12,2) not null check (amount >= 0),
  payment_date   timestamptz not null default now(),
  payment_method text
);

-- ============================================
-- 3) ÍNDICES
-- ============================================
create index if not exists idx_clients_phone on public.clients (phone_number);

create index if not exists idx_services_name on public.services (name);

create index if not exists idx_appointments_client_id on public.appointments (client_id);
create index if not exists idx_appointments_service_id on public.appointments (service_id);
create index if not exists idx_appointments_date on public.appointments (appointment_date);
create index if not exists idx_appointments_status on public.appointments (status);

create index if not exists idx_invoices_appointment_id on public.invoices (appointment_id);

create index if not exists idx_invoice_items_invoice_id on public.invoice_items (invoice_id);
create index if not exists idx_invoice_items_service_id on public.invoice_items (service_id);

create index if not exists idx_payments_appointment_id on public.payments (appointment_id);
create index if not exists idx_payments_date on public.payments (payment_date);

-- ============================================
-- 4) VISTAS ÚTILES (para simplificar queries en la app)
-- ============================================

-- Citas pendientes (scheduled) con info del cliente y servicio
create or replace view public.v_pending_appointments_with_clients as
select
  a.id as appointment_id,
  c.id as client_id,
  c.first_name,
  c.last_name,
  s.id as service_id,
  s.name as service_name,
  s.price as service_price,
  a.appointment_date,
  a.deposit_amount,
  a.status
from public.appointments a
join public.clients c on c.id = a.client_id
join public.services s on s.id = a.service_id
where a.status = 'scheduled';

-- Detalle completo de factura (encabezado + ítems)
create or replace view public.v_invoice_full as
select
  i.id as invoice_id,
  i.invoice_date,
  i.total_amount,
  i.paid_amount,
  i.change_amount,
  i.late_fee,
  i.discount,
  i.notes,
  a.id as appointment_id,
  a.appointment_date,
  a.deposit_amount,
  a.status as appointment_status,
  c.id as client_id,
  c.first_name,
  c.last_name,
  s.id as base_service_id,
  s.name as base_service_name,
  s.price as base_service_price,
  ii.id as invoice_item_id,
  ii.service_id as item_service_id,
  ii.service_name as item_service_name,
  ii.unit_price as item_unit_price,
  ii.quantity as item_quantity,
  ii.line_total as item_line_total
from public.invoices i
join public.appointments a on a.id = i.appointment_id
join public.clients c on c.id = a.client_id
join public.services s on s.id = a.service_id
left join public.invoice_items ii on ii.invoice_id = i.id;

-- ============================================
-- 5) FUNCIÓN RPC para guardar factura completa de forma atómica
-- ============================================

create or replace function public.save_invoice_with_items(
  p_appointment_id bigint,
  p_total_amount numeric,
  p_paid_amount numeric,
  p_change_amount numeric,
  p_late_fee numeric default 0,
  p_discount numeric default 0,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_invoice_id bigint;
  v_item jsonb;
begin
  -- Crear factura
  insert into public.invoices(
    appointment_id, total_amount, paid_amount, change_amount, 
    late_fee, discount, notes
  )
  values (
    p_appointment_id, p_total_amount, p_paid_amount, p_change_amount, 
    p_late_fee, p_discount, p_notes
  )
  returning id into v_invoice_id;

  -- Insertar ítems de la factura
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.invoice_items(
      invoice_id, service_id, service_name, unit_price, quantity, line_total
    )
    values (
      v_invoice_id,
      case 
        when (v_item->>'service_id') = '' or (v_item->>'service_id') is null 
        then null 
        else (v_item->>'service_id')::bigint 
      end,
      (v_item->>'service_name'),
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::int,
      (v_item->>'line_total')::numeric
    );
  end loop;

  -- Marcar cita como completada
  update public.appointments
    set status = 'completed'
  where id = p_appointment_id;

  return v_invoice_id;
exception
  when others then
    -- Si algo falla, la transacción se revierte automáticamente
    raise;
end;
$$;
