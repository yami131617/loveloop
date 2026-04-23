# LoveLoop — PWA, Android APK, iOS IPA

Three distribution paths, each valid on its own. Start with the simplest and escalate only when you have real users.

## 1. PWA (Progressive Web App) — free, 0 install friction

Works the moment the web is deployed. User steps:

- **iOS**: open Safari → go to your URL → Share → "Add to Home Screen"
- **Android (Chrome)**: the in-app banner ("Install LoveLoop") from [PWARegister.tsx](web/src/components/PWARegister.tsx) pops automatically when the manifest criteria are met

What you already have:
- Manifest: [web/public/manifest.json](web/public/manifest.json)
- Service worker: [web/public/sw.js](web/public/sw.js) (offline shell + push support wired)
- Icons: [web/public/icons/](web/public/icons/) — 10 sizes + maskable + Apple touch + favicon + splash
- Install prompt component: mounted in root layout

Prerequisite: deploy the web somewhere with HTTPS (Vercel / Railway / Netlify). Service workers don't register on `http://`.

## 2. Android APK via GitHub Actions

Every push to `main` touching `web/**` triggers the workflow at [.github/workflows/android.yml](.github/workflows/android.yml). The APK lands in **Actions → Artifacts → LoveLoop-APK**. Tagged pushes (`v*.*.*`) attach the APK to a GitHub Release automatically.

Architecture:
- Capacitor wraps the web as a WebView (~8 MB APK shell)
- `server.url` in [capacitor.config.ts](web/capacitor.config.ts) points to the live web URL
- Every code change = instant update for every user (no re-install, no store review)
- Override URL for a specific build: **Actions → Build Android APK → Run workflow → server_url**

To publish to Play Store:
1. Create a keystore (one time):
   ```bash
   keytool -genkey -v -keystore loveloop-release.jks -keyalg RSA -keysize 2048 \
     -validity 10000 -alias loveloop
   ```
2. Add these GitHub Action secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
3. Switch the workflow to `assembleRelease` + a signing block. (Ask me when you're ready — 10 lines change.)
4. [Play Console](https://play.google.com/console) → $25 one-time → "Create app" → upload AAB → internal testing track → add testers by email → they install via Play Store.

## 3. iOS IPA via Codemagic (no Mac required)

Build from Windows using Codemagic's Mac Mini M2 cloud runners.

Pipeline in [codemagic.yaml](codemagic.yaml):
- **`android-debug`** — free sanity check on Linux runner
- **`ios-testflight`** — builds on every push, uploads to TestFlight automatically
- **`ios-appstore`** — triggers on `v*.*.*` tag, submits to App Store

Setup once (10 min):
1. Sign up at [codemagic.io](https://codemagic.io) — free tier is 500 macOS minutes/month (~10 builds)
2. Connect your GitHub repo
3. Apple Developer account ($99/yr, apple.com/programs) → create an **App Store Connect API key** (Users and Access → Integrations → App Store Connect API)
4. In Codemagic: **Teams → Integrations → App Store Connect → Add** → paste the API key. Name it `loveloop_asc_key` (matches the yaml).
5. In App Store Connect: create an app with bundle id `app.loveloop.gen` (or edit in yaml).
6. Push → Codemagic runs `ios-testflight` → app lands in TestFlight. Invite up to 10,000 external testers by email.
7. When ready for store: `git tag v1.0.0 && git push --tags` → Codemagic runs `ios-appstore` → submits for review.

Alternative pipelines if you prefer another CI:
- **EAS Build (Expo)**: `npm i -g eas-cli && eas build --platform ios` — free 30 builds/month
- **GitHub Actions macOS runners**: free for public repos, 2000 min/month for private

## Update flow (once everything is live)

- **Web / PWA**: `git push` → Vercel redeploys → users get new code on next page load
- **Android**: same — WebView loads the latest web every session
- **iOS**: same — unless you change the native shell (icons, permissions, Capacitor version), no re-submission needed

The only time you re-upload to the stores is when:
- App icon or splash changes
- You add a Capacitor plugin that needs new native permissions (camera, push, location, …)
- You bump Capacitor major version

Everything else ships via `git push`.

## Testing the APK locally (before a real Play Store push)

1. Install the debug APK on any Android phone: enable "Install unknown apps" for your browser, download the artifact, tap to install
2. The WebView loads `CAP_SERVER_URL`. For local LAN testing, build with that set to your dev IP:
   ```
   # Via GitHub Actions → Run workflow → server_url = http://192.168.x.y:3000
   ```
   and make sure your phone is on the same Wi-Fi.

## TL;DR cost table

| Path             | Up-front | Recurring      | Time to first install |
|------------------|----------|----------------|-----------------------|
| PWA              | $0       | $0             | deploy web → done     |
| APK sideload     | $0       | $0             | push to main (~10 min CI) |
| Play Store       | $25 once | $0             | 1–3 day review         |
| TestFlight (iOS) | $99/yr   | Codemagic free 500 min | 24h Apple review |
| App Store (iOS)  | $99/yr   | Codemagic $0–$29/mo    | 1–2 week review  |
