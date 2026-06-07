-- Device tokens for native push notifications (FCM / APNs via Capacitor).

create table if not exists public.push_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_device_tokens_user_id_idx
  on public.push_device_tokens (user_id);

alter table public.push_device_tokens enable row level security;

drop policy if exists push_device_tokens_own on public.push_device_tokens;

create policy push_device_tokens_own
  on public.push_device_tokens
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
