# Supabase migrations

This folder contains **incremental** migrations applied on top of the live Gather database.

It does **not** include the full base schema (tables like `events`, `calendar_tabs`, `notes`, `lists`, `tab_shares`, `accounts`, `profiles`, etc.). That schema was created earlier and lives in your hosted Supabase project.

## For an existing project

Run new migration files in the Supabase SQL Editor (or `supabase db push`) in filename order.

## For a brand-new database

You cannot bootstrap from this repo alone. Either:

1. **Clone schema from production** — Supabase Dashboard → Database → Backups / schema export, or `pg_dump --schema-only` from the live project.
2. **Link the CLI** — `supabase link` to the hosted project and pull remote schema: `supabase db pull`.

Keep new changes as dated SQL files in this directory.
