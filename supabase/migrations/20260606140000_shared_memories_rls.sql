-- Allow users to read memories (event_assets) on tables they own or that are shared with them.

alter table public.event_assets enable row level security;

drop policy if exists event_assets_select_accessible on public.event_assets;

create policy event_assets_select_accessible
  on public.event_assets
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or tab_id in (
      select ct.id
      from public.calendar_tabs ct
      where ct.owner_id = auth.uid()
    )
    or tab_id in (
      select ts.tab_id
      from public.tab_shares ts
      where ts.shared_with_id = auth.uid()
         or ts.invited_user_id = auth.uid()
         or lower(ts.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
