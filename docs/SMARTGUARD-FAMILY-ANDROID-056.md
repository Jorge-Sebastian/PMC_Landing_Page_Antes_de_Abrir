# SmartGuard 0.5.6 Family Alpha

This APK is an **interactive local prototype**, not a connected family-alert service.

## Included

- Keeps the SmartGuard v0.5.5 Android welcome flow and **optional Clerk login**.
- Adds a Family button to the existing Android dashboard, without replacing it.
- Lets testers create a local circle, create simulated invitations, accept them on the same phone, model separate consent, and register/acknowledge simulated alerts.
- Adds a "Pedir ayuda a mi familia (prueba)" action to suspicious-link analysis; it opens the Family flow with the observed public domain only.
- Stores Family demo state on the **local device only**; no messages, tokens or complete links are sent to other devices.

## Not included / limitation

- No real family invitations or notifications arrive on other phones.
- No automatic detection of external link-opening events.
- No real shared threat blacklist or production backend setup.
- No real Android device test has been performed by the assistant.

## Build integrity

- Based on the verified v0.5.5 APK, not older 0.4.0 Android screens.
- Version name: 0.5.6-piloto; versionCode: 13.
- Uses the same signing certificate as v0.5.4/v0.5.5 for Android update compatibility.
- ZIP integrity, signed APK scheme v2 and JavaScript syntax were verified.

## Installation

Install the APK directly over an existing 0.5.4 or 0.5.5 pilot installation.
Do not uninstall the previous installation first. If Android rejects the update, do not delete your existing local data; compare the installed APK's signer and version first.

## Reproducing

- Source: `scripts/android/family_native_v056.js`, `family_native_v056.css`, `build_family_apk.py`.
- Provide the locally held v0.5.5 APK and the original **untracked** test signing key.
- Do not commit, email or share the keystore.
- Do not market this alpha as multi-device protection until a dedicated SmartGuard backend is connected, authenticated and security-tested.