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
- iOS: Google/Apple open in the in-app browser (`@capacitor/browser`)
- Android: Google/Apple open through external browser navigation to avoid stale Custom Tab crashes
- App returns via `@capacitor/app` `appUrlOpen` listener (see `login.jsx`)

## Safe area (status bar)

After pulling, run `npm run build:mobile`. The app uses `@capacitor/status-bar` plus CSS `--gather-safe-top` so the mobile header clears the Android status bar.

## Push notifications

1. Run migration `20260606150000_push_device_tokens.sql` in Supabase.
2. **Android:** add `google-services.json` from Firebase to `android/app/` (see **Firebase setup** below).
3. **iOS:** enable Push Notifications for bundle id `com.Dimouro.gather` in Apple Developer/Xcode Signing & Capabilities, then verify the provisioning profile includes APNs.
4. Enable notification toggles in Settings — native apps register device tokens automatically.
5. Automated sends (reminders, digests) still need a server job using stored tokens.

## Firebase setup (Android push — do this before your device arrives)

Gather’s Android app id is **`com.Dimouro.gather`**. The Gradle build auto-applies the Google Services plugin when `android/app/google-services.json` exists.

### 1. Create the Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Name it e.g. **Gather** (can match your Play app).
3. Disable Google Analytics if you want a minimal setup (optional; not required for FCM).
4. Create the project.

### 2. Register the Android app

1. In the project overview → **Add app** → **Android**.
2. **Android package name:** `com.Dimouro.gather` (must match exactly).
3. **App nickname:** Gather (optional).
4. **Debug signing certificate SHA-1** (add now for emulator + USB debug on your PC):

   ```
   SHA-1:   13:FB:E9:A9:97:71:F0:9B:63:F8:58:7A:A6:7A:53:FA:93:65:58:85
   SHA-256: C5:FB:6C:BB:06:7A:B1:B6:3E:FA:9F:33:16:00:B7:D3:30:55:3E:C3:E5:79:54:3C:34:62:BB:03:53:84:F4:BB
   ```

   This is your **debug** keystore (`%USERPROFILE%\.android\debug.keystore`). Re-run if you use a different machine:

   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v `
     -keystore "$env:USERPROFILE\.android\debug.keystore" `
     -alias androiddebugkey -storepass android -keypass android
   ```

5. Skip “Download google-services.json” for a moment → **Continue to console**.

6. **Project settings** (gear) → **Your apps** → select the Android app → **Add fingerprint** if you skipped SHA-1 earlier.

### 3. Enable Cloud Messaging

1. Firebase Console → **Build** → **Cloud Messaging**.
2. If prompted, enable the **Firebase Cloud Messaging API** (also check [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → enable **Firebase Cloud Messaging API** for the same project).

### 4. Download `google-services.json`

1. Firebase → **Project settings** → **Your apps** → Android `com.Dimouro.gather`.
2. **Download google-services.json**.
3. Place it here (exact path):

   ```
   android/app/google-services.json
   ```

   Not `android/google-services.json` — it must be inside **`android/app/`**.

### 5. Rebuild and verify

```bash
npm run build:mobile
npm run cap:open:android
```

In Android Studio: Run on emulator or device → Gather → **Settings** → turn on **Event reminders** (or any notification toggle) → accept the permission prompt.

Check Logcat for push registration; tokens are stored in Supabase `push_device_tokens` when registration succeeds.

### 6. Before Play Store release (later)

Add your **Play App Signing** SHA-1 from Google Play Console → **Setup** → **App signing** → paste into Firebase under the same Android app. Debug SHA-1 alone is not enough for production installs from Play.

### 7. Server-side push (later)

Device registration is in the app; **sending** pushes still needs a backend job (Supabase Edge Function, etc.) using FCM with a **Firebase service account** or legacy server key. Keep the service account JSON private — never commit it.

## Shared memories

Run migration `20260606140000_shared_memories_rls.sql` so collaborators see memories on shared tables.

## Legal (store listings)

- Privacy: deploy `/privacy` — copy references `src/lib/legal.js`
- Terms: deploy `/terms`
- Operator and support contact are defined in `src/lib/legal.js`

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
