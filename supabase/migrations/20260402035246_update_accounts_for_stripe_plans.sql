-- Expand allowed plan tiers
alter table public.accounts
  drop constraint if exists accounts_plan_tier_check;

alter table public.accounts
  add constraint accounts_plan_tier_check
  check (plan_tier in ('free', 'plus', 'family_team', 'business'));

-- Add Stripe billing fields
alter table public.accounts
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_price_id text;

-- Make sure billing_source default exists
alter table public.accounts
  alter column billing_source set default 'none';

-- Expand allowed billing sources
alter table public.accounts
  drop constraint if exists accounts_billing_source_check;

alter table public.accounts
  add constraint accounts_billing_source_check
  check (billing_source in ('none', 'apple', 'stripe', 'admin'));

-- Clean up existing bad/null plan values
update public.accounts
set plan_tier = 'free'
where plan_tier is null
   or plan_tier not in ('free', 'plus', 'family_team', 'business');