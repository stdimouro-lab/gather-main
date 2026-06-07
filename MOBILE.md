# Gather — Mobile (iOS & Android)

Gather ships as a **Capacitor** app: the React web app in `dist/` runs inside native iOS/Android shells.

## Prerequisites

| Platform | Where | Tools |
|----------|-------|-------|
| **Shared** | Windows or Mac | Node 20+, `npm install`, `.env.local` from `.env.example` |
| **iOS** | Mac only (MacinCloud) | Xcode 15+, CocoaPods |
| **Android** | Windows or Mac | Android Studio, JDK 17 |

## One-time Supabase setup

In **Supabase → Authentication → URL configuration**, add redirect URLs:

```
gather://auth/callback
gather://auth/callback?next=/calendar
https://gatherapp.me/auth/callback
http://localhost:5173/auth/callback
```

## Build workflow (Windows — daily dev)

```bash
npm install
npm run build:mobile
```

This runs `vite build` then `cap sync` for **both** iOS and Android (copies `dist/` into native projects).

### Android on Windows

```bash
npm run cap:open:android
```

Opens Android Studio → run on emulator or device.

### iOS on MacinCloud

```bash
git pull
npm install
npm run build:mobile
cd ios/App && pod install && cd ../..
npm run cap:open:ios
```

In Xcode: select your team → run on simulator/device → test Google/Apple sign-in.

If `cap sync` warns about mismatched `@capacitor/core` versions, run on Mac:

```bash
npm install @capacitor/core@8.1.0 @capacitor/ios@8.1.0 @capacitor/android@8.1.0
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Web production build only |
| `npm run build:mobile` | Build + sync iOS & Android |
| `npm run cap:sync` | Sync web assets to native projects |
| `npm run cap:sync:ios` | iOS only |
| `npm run cap:sync:android` | Android only |
| `npm run cap:open:ios` | Open Xcode (Mac only) |
| `npm run cap:open:android` | Open Android Studio |

## Environment variables for store builds

Vite embeds env vars at **build time**. Before `npm run build:mobile`, ensure `.env.local` includes:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `VITE_REVENUECAT_IOS_API_KEY` (iOS)
- `VITE_REVENUECAT_ANDROID_API_KEY` (Android)

Stripe keys are for web only; native apps use RevenueCat / store billing.

## RevenueCat

1. Create iOS + Android apps in RevenueCat linked to App Store Connect / Play Console.
2. Match entitlement IDs: `Plus`, `FamilyTeam`, `Pro`.
3. Offering id: `plus` (default in code).

## OAuth on native

- Redirect: `gather://auth/callback`
- Google/Apple open in in-app browser (`@capacitor/browser`)
- App returns via `@capacitor/app` `appUrlOpen` listener (see `login.jsx`)

## Safe area (status bar)

After pulling, run `npm run build:mobile`. The app uses `@capacitor/status-bar` plus CSS `--gather-safe-top` so the mobile header clears the Android status bar.

## Push notifications

1. Run migration `20260606150000_push_device_tokens.sql` in Supabase.
2. **Android:** add `google-services.json` from Firebase to `android/app/`.
3. Enable notification toggles in Settings — native apps register device tokens automatically.
4. Automated sends (reminders, digests) still need a server job using stored tokens.

## Shared memories

Run migration `20260606140000_shared_memories_rls.sql` so collaborators see memories on shared tables.

## Legal (store listings)

- Privacy: deploy `/privacy` — copy references `src/lib/legal.js`
- Terms: deploy `/terms`
- Update `operatorLabel` in `legal.js` when your LLC name is finalized

## Known native limitations (v1)

- **Voice add** on Lists is hidden in native apps (Web Speech API unavailable in WebView).
- **Stripe checkout** is web-only; native uses in-app purchases.
- **Push delivery** — device registration works; scheduled server pushes are not live yet.

## Store checklist

### iOS (App Store)

- [ ] Apple Developer account + bundle id `com.Dimouro.gather`
- [ ] App icons & launch screen in `ios/App/App/Assets.xcassets`
- [ ] TestFlight internal testing
- [ ] Privacy policy URL in App Store Connect
- [ ] In-app purchase products + RevenueCat

### Android (Play Store)

- [ ] Google Play Console app
- [ ] Signing key (upload key + Play App Signing)
- [ ] Adaptive icon in `android/app/src/main/res`
- [ ] Internal testing track
- [ ] Data safety form
- [ ] Subscriptions in Play Console + RevenueCat
