-- Link lists to calendar events (packing lists, party supplies, etc.)
alter table public.lists
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists lists_event_id_idx on public.lists(event_id);

comment on column public.lists.event_id is 'Optional calendar event this checklist is attached to';
