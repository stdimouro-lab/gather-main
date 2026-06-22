-- Allow safe promo access grants without weakening RLS or exposing real data.

alter table public.accounts
  drop constraint if exists accounts_billing_source_check;

alter table public.accounts
  add constraint accounts_billing_source_check
  check (billing_source in ('none', 'apple', 'stripe', 'admin', 'promo'));

alter table public.accounts
  add column if not exists promo_reason text,
  add column if not exists promo_starts_at timestamptz,
  add column if not exists promo_ends_at timestamptz;

create table if not exists public.promo_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('plus', 'family_team', 'business')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  reason text not null,
  created_by text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promo_access_user_active_idx
  on public.promo_access (user_id, active, starts_at, ends_at);

alter table public.promo_access enable row level security;

drop policy if exists "Users can read their own promo access" on public.promo_access;

create policy "Users can read their own promo access"
  on public.promo_access
  for select
  using (auth.uid() = user_id);
