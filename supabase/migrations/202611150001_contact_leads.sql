-- PORFOLIO 2.0 — private lead inbox
-- Public visitors must submit through a server-side Edge Function (service role).
create table if not exists public.contact_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 5 and 254),
  organization text,
  request_type text not null check (request_type in ('devis','partenariat','investissement','collaboration','autre')),
  service_slug text,
  project_slug text,
  budget_range text,
  timeline text,
  message text not null check (char_length(trim(message)) between 10 and 5000),
  consent_at timestamptz not null,
  status text not null default 'new' check (status in ('new','qualified','in_progress','won','lost','spam')),
  source text not null default 'portfolio',
  assigned_to uuid,
  internal_notes text
);
create index if not exists contact_leads_created_at_idx on public.contact_leads (created_at desc);
create index if not exists contact_leads_status_created_idx on public.contact_leads (status, created_at desc);
alter table public.contact_leads enable row level security;
-- No anon/authenticated policies: the browser cannot read or insert leads directly.
revoke all on table public.contact_leads from anon, authenticated;
grant all on table public.contact_leads to service_role;
