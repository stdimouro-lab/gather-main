-- Recommended query indexes for Home, Calendar, Notes, Lists, sharing at scale.
-- Safe to run multiple times (IF NOT EXISTS).

create index if not exists events_tab_id_idx on public.events (tab_id);
create index if not exists events_start_at_idx on public.events (start_at);
create index if not exists events_owner_id_idx on public.events (owner_id);

create index if not exists notes_tab_id_idx on public.notes (tab_id);
create index if not exists notes_owner_id_idx on public.notes (owner_id);

create index if not exists event_assets_owner_id_idx on public.event_assets (owner_id);
create index if not exists event_assets_created_at_idx on public.event_assets (created_at desc);

create index if not exists lists_owner_id_idx on public.lists (owner_id);
create index if not exists lists_event_id_idx on public.lists (event_id);

create index if not exists list_items_list_id_idx on public.list_items (list_id);
create index if not exists list_items_owner_id_idx on public.list_items (owner_id);

create index if not exists tab_shares_tab_id_idx on public.tab_shares (tab_id);
create index if not exists tab_shares_shared_with_id_idx on public.tab_shares (shared_with_id);
create index if not exists tab_shares_invited_email_idx on public.tab_shares (invited_email);
