-- Align the database statuses with the CRM interface/API.
-- Historical values won/lost are replaced by the operational closed status.
alter table public.contact_leads drop constraint if exists contact_leads_status_check;
alter table public.contact_leads add constraint contact_leads_status_check
  check (status in ('new','in_progress','qualified','closed','spam'));
