-- Google Play review account setup.
--
-- Run after creating review@gatherapp.me in Supabase Auth.
-- Run migration 20260621130000_promo_access_for_review.sql first.
--
-- This script does not bypass RLS globally and does not grant access to real user data.
-- It only creates/updates content owned by review@gatherapp.me.

do $$
declare
  review_email constant text := 'review@gatherapp.me';
  collaborator_email constant text := 'review-collaborator@gatherapp.me';
  review_user_id uuid;
  collaborator_user_id uuid;
  review_account_id uuid;
  family_tab_id uuid;
  shared_tab_id uuid;
  picnic_event_id uuid;
  packing_list_id uuid;
begin
  select id
    into review_user_id
  from auth.users
  where lower(email) = review_email
  limit 1;

  if review_user_id is null then
    raise exception 'Create % in Authentication -> Users before running this script.', review_email;
  end if;

  select id
    into collaborator_user_id
  from auth.users
  where lower(email) = collaborator_email
  limit 1;

  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = review_user_id;

  if collaborator_user_id is not null then
    update auth.users
    set
      email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = collaborator_user_id;
  end if;

  update public.profiles
  set
    email = review_email,
    full_name = 'Gather Demo Family',
    onboarding_completed = true,
    onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now()),
    updated_at = now()
  where id = review_user_id;

  if collaborator_user_id is not null then
    update public.profiles
    set
      email = collaborator_email,
      full_name = 'Demo Collaborator',
      onboarding_completed = true,
      onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now()),
      updated_at = now()
    where id = collaborator_user_id;
  end if;

  insert into public.accounts (
    owner_id,
    plan_tier,
    billing_source,
    plan_status,
    is_comped,
    seat_limit,
    seats_used,
    storage_limit_mb,
    storage_used_mb,
    promo_reason,
    promo_starts_at,
    promo_ends_at,
    updated_at
  )
  values (
    review_user_id,
    'family_team',
    'promo',
    'active',
    false,
    11,
    1,
    15360,
    0,
    'google_play_review',
    now(),
    now() + interval '1 year',
    now()
  )
  on conflict (owner_id) do update
  set
    plan_tier = 'family_team',
    billing_source = 'promo',
    plan_status = 'active',
    is_comped = false,
    seat_limit = 11,
    storage_limit_mb = 15360,
    promo_reason = 'google_play_review',
    promo_starts_at = coalesce(public.accounts.promo_starts_at, now()),
    promo_ends_at = now() + interval '1 year',
    updated_at = now()
  returning id into review_account_id;

  insert into public.promo_access (
    user_id,
    plan,
    starts_at,
    ends_at,
    reason,
    created_by,
    active
  )
  select
    review_user_id,
    'family_team',
    now(),
    now() + interval '1 year',
    'google_play_review',
    'manual_sql_seed',
    true
  where not exists (
    select 1
    from public.promo_access
    where user_id = review_user_id
      and reason = 'google_play_review'
      and active = true
  );

  insert into public.account_members (
    account_id,
    user_id,
    email,
    role,
    status
  )
  select
    review_account_id,
    review_user_id,
    review_email,
    'owner',
    'active'
  where not exists (
    select 1
    from public.account_members
    where account_id = review_account_id
      and user_id = review_user_id
  );

  select id
    into family_tab_id
  from public.calendar_tabs
  where owner_id = review_user_id
    and name = 'Demo Family'
  limit 1;

  if family_tab_id is null then
    insert into public.calendar_tabs (owner_id, name, color, is_default)
    values (review_user_id, 'Demo Family', 'indigo', true)
    returning id into family_tab_id;
  end if;

  select id
    into shared_tab_id
  from public.calendar_tabs
  where owner_id = review_user_id
    and name = 'Shared Practice Table'
  limit 1;

  if shared_tab_id is null then
    insert into public.calendar_tabs (owner_id, name, color, is_default)
    values (review_user_id, 'Shared Practice Table', 'emerald', false)
    returning id into shared_tab_id;
  end if;

  update public.events
  set
    title = 'Soccer Practice',
    start_at = date_trunc('day', now()) + interval '1 day 17 hours',
    end_at = date_trunc('day', now()) + interval '1 day 18 hours 30 minutes',
    updated_at = now()
  where owner_id = review_user_id
    and tab_id = family_tab_id
    and lower(title) = lower('Soccer Practice');

  update public.events
  set
    title = 'Family Picnic',
    start_at = date_trunc('day', now()) + interval '3 days 12 hours',
    end_at = date_trunc('day', now()) + interval '3 days 14 hours',
    updated_at = now()
  where owner_id = review_user_id
    and tab_id = family_tab_id
    and lower(title) = lower('Family Picnic');

  insert into public.events (
    owner_id,
    tab_id,
    title,
    start_at,
    end_at,
    location,
    event_type,
    visibility,
    notes,
    all_day
  )
  select
    review_user_id,
    family_tab_id,
    'Doctor Appointment',
    date_trunc('day', now()) + interval '15 hours',
    date_trunc('day', now()) + interval '15 hours 45 minutes',
    'Pediatric Wellness Center',
    'appointment',
    'private',
    'Today demo event so Home and the dashboard have activity immediately.',
    false
  where not exists (
    select 1 from public.events
    where owner_id = review_user_id
      and tab_id = family_tab_id
      and lower(title) = lower('Doctor Appointment')
  );

  insert into public.events (
    owner_id,
    tab_id,
    title,
    start_at,
    end_at,
    location,
    event_type,
    visibility,
    notes,
    all_day
  )
  select
    review_user_id,
    family_tab_id,
    'Soccer Practice',
    date_trunc('day', now()) + interval '1 day 17 hours',
    date_trunc('day', now()) + interval '1 day 18 hours 30 minutes',
    'Community field',
    'activity',
    'private',
    'Demo event for Google Play review.',
    false
  where not exists (
    select 1 from public.events
    where owner_id = review_user_id
      and tab_id = family_tab_id
      and lower(title) = lower('Soccer Practice')
  );

  insert into public.events (
    owner_id,
    tab_id,
    title,
    start_at,
    end_at,
    location,
    event_type,
    visibility,
    notes,
    all_day
  )
  select
    review_user_id,
    family_tab_id,
    'Family Picnic',
    date_trunc('day', now()) + interval '3 days 12 hours',
    date_trunc('day', now()) + interval '3 days 14 hours',
    'Riverside Park',
    'family',
    'private',
    'Use this event to test event details, reminders, notes, and memories.',
    false
  where not exists (
    select 1 from public.events
    where owner_id = review_user_id
      and tab_id = family_tab_id
      and lower(title) = lower('Family Picnic')
  );

  select id
    into picnic_event_id
  from public.events
  where owner_id = review_user_id
    and tab_id = family_tab_id
    and lower(title) = lower('Family Picnic')
  limit 1;

  insert into public.notes (
    owner_id,
    tab_id,
    title,
    body,
    pinned,
    visibility
  )
  select
    review_user_id,
    family_tab_id,
    'Reviewer welcome note',
    'This demo account has sample calendar events, notes, lists, and a shared table invite. No real customer data is visible.',
    true,
    'table'
  where not exists (
    select 1 from public.notes
    where owner_id = review_user_id
      and tab_id = family_tab_id
      and title = 'Reviewer welcome note'
  );

  select id
    into packing_list_id
  from public.lists
  where owner_id = review_user_id
    and title = 'Picnic packing list'
  limit 1;

  if packing_list_id is null then
    insert into public.lists (
      owner_id,
      event_id,
      title,
      icon,
      color,
      is_pinned,
      is_shared
    )
    values (
      review_user_id,
      picnic_event_id,
      'Picnic packing list',
      'check',
      'indigo',
      true,
      false
    )
    returning id into packing_list_id;
  end if;

  insert into public.list_items (list_id, owner_id, text, completed, sort_order)
  select packing_list_id, review_user_id, item_text, false, sort_order
  from (
    values
      ('Blanket', 1),
      ('Snacks', 2),
      ('Water bottles', 3),
      ('Sunscreen', 4)
  ) as items(item_text, sort_order)
  where not exists (
    select 1 from public.list_items
    where list_id = packing_list_id
      and text = item_text
  );

  insert into public.tab_shares (
    tab_id,
    account_id,
    owner_id,
    invited_email,
    shared_by_id,
    role,
    accepted,
    status
  )
  select
    shared_tab_id,
    review_account_id,
    review_user_id,
    collaborator_email,
    review_user_id,
    'editor',
    false,
    'pending'
  where not exists (
    select 1 from public.tab_shares
    where tab_id = shared_tab_id
      and invited_email = collaborator_email
  );

  if collaborator_user_id is not null then
    update public.tab_shares
    set
      invited_user_id = collaborator_user_id,
      shared_with_id = collaborator_user_id,
      accepted = true,
      status = 'accepted'
    where tab_id = shared_tab_id
      and invited_email = collaborator_email;
  end if;

  begin
    insert into public.event_assets (
      owner_id,
      event_id,
      tab_id,
      storage_path,
      asset_type,
      mime_type,
      title,
      file_name,
      caption
    )
    select
      review_user_id,
      picnic_event_id,
      family_tab_id,
      'demo/google-play-review/family-picnic.jpg',
      'image',
      'image/jpeg',
      'Family picnic memory',
      'family-picnic.jpg',
      'Demo memory metadata for Google Play review.'
    where picnic_event_id is not null
      and not exists (
        select 1 from public.event_assets
        where owner_id = review_user_id
          and title = 'Family picnic memory'
      );
  exception
    when undefined_table or undefined_column or not_null_violation or foreign_key_violation then
      raise notice 'Skipped demo memory asset insert. Add a real uploaded memory manually if event_assets requires storage-backed files.';
  end;
end $$;
