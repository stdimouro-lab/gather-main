# Gather

Gather is a modern calendar and life organizer for families, work, and shared tables.

## Features
- Shared tables (family, work, personal)
- Recurring events
- Notes and memories
- Role-based sharing (viewer/editor)

## Tech Stack
- React + Vite
- Supabase Auth & Database
- Cloudflare Pages

## Development
```bash
npm install
cp .env.example .env.local   # add your Supabase keys
npm run dev
```

## Mobile (iOS & Android)

Gather uses Capacitor. See **[MOBILE.md](./MOBILE.md)** for the full workflow.

```bash
npm run build:mobile          # Windows: build + sync both platforms
npm run cap:open:android      # Windows: Android Studio
# On MacinCloud:
npm run cap:open:ios          # Xcode → pod install first
```