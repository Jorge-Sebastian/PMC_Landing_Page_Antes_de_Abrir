# Android and web: one SmartGuard repository

This repository is the source of truth for the web app **and** Android (Capacitor 6).
The Android source comes from the supplied `SmartGuard_v0.4.0_Android_y_Proyecto.zip`,
which includes a native `NotificationListenerService`, Java `Protection` plugin and a
shared TypeScript analysis engine. Android's Java code lives in `android/app/src/main/java/co/antesdeabrir/piloto/`;
mobile UI and engine code lives in `src/mobile/`. The website continues to use the
existing `src/pages/home/` experience.

**Important: do not confuse artifact versions.** `main` previously contained
`public/downloads/SmartGuard-v0.5.4-piloto.apk`. The source provided here is
**0.4.0**, not evidence that we can rebuild 0.5.4. The public 0.5.4 APK is deliberately
left untouched until its source and signing identity are verified. Do not publish an
older APK as a new update.

## Build web

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm build:prod
```

## Build Android

Requirements: Node 22, pnpm 9, Java 17, Android SDK 34 (build tools 34),
Android SDK licenses accepted. From repository root:

```bash
pnpm install --frozen-lockfile
pnpm android:bundle
cd android
./gradlew :app:assembleDebug
```

On Windows use `gradlew.bat`. APK output:
`android/app/build/outputs/apk/debug/app-debug.apk`.

`android:bundle` builds the web assets for Capacitor, runs `cap sync android`
and generates `shared-engine.html` plus `backend.json`. These are generated files,
not source. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` via environment
variables (for CI) or a local **untracked** `.env.mobile` to enable server destination
checks. Set `REQUIRE_ANDROID_BACKEND=true` when preparing an externally distributed
pilot to fail instead of creating an APK with remote checks disabled.
Never commit `.env.mobile` or the signing key.

## Signing and versioning

The v0.4.0 project referenced a local test keystore. It is deliberately NOT included.
If the original `android/signing/smartguard-pilot.keystore` is present locally,
Gradle uses it for debug compatibility; without it Gradle uses the standard debug
key. An APK signed by a different key **cannot update** an existing installation.
The published APK called `0.5.4` may have different source/signing; verify before
shipping replacements. Pilot version in this source is `0.4.0-piloto` (`versionCode 7`).

## Privacy and permissions

The Android pilot inspects links visible in notifications only after explicit
notification-access permission. It cannot guarantee observing a user opening a URL
in another app, nor does importing the Android project implement family notifications.
Any family-circle feature requires separate authenticated storage, permission rules,
consent and event instrumentation. Avoid forwarding raw message text or personal URLs.

## GitHub CI

The Android workflow builds a debug APK as an artifact for internal review; it does
not update the downloadable 0.5.4 APK or publish a release. Configure repository
variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` if you want that
artifact to perform remote link checks. CI will warn when these are absent.
Test on actual Android devices before distribution: permissions, notification
access, SMS/WhatsApp with links, foreground/background and the detailed warning view.
