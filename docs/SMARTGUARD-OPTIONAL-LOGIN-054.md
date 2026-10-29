# SmartGuard 0.5.5 pilot: Clerk optional

The project currently has the **original 0.5.4 APK binary** but not its
corresponding original 0.5.4 Android UI source. To avoid replacing the newer
onboarding with the older 0.4.0 interface, this transitional patch updates the
v0.5.4 APK's bundled JavaScript directly.

The patch does not change Android permissions, listeners, native code or backend
configuration. It changes only the existing onboarding flow:

- App protection, permissions, alerts and dashboard are accessible as a guest.
- Clerk sign-in remains available **optionally** from the dashboard.
- The consent and Android permission requirements remain mandatory.
- Previously completed onboarding is preserved for signed-in users when
  migrating to an account-independent device onboarding record.
- Version changes from 0.5.4-piloto (code 11) to 0.5.5-piloto (code 12).

## Build locally

Requires Python 3.12+ and `cryptography` (tested locally with Python 3.13),
and the **original compatible signing key**. Do not commit any keystores or
passwords.

```bash
python -m pip install cryptography
python scripts/android/patch_optional_login_v054.py \
  --base public/downloads/SmartGuard-v0.5.4-piloto.apk \
  --keystore /secure/location/smartguard-pilot.keystore \
  --output SmartGuard-v0.5.5-login-opcional.apk
```

The script checks the base APK, updates the binary Android manifest, rebuilds a
4-byte aligned APK, signs it with APK Signature Scheme v2, and independently
checks its digest and signature. A GitHub Actions CI workflow additionally
verifies a **temporary test-signed** build with Android `apksigner`, without
uploading the real signing key.

For in-place installation, the new APK must have **the same certificate as the
installed version**. A build signed with another key cannot replace the
installed app. The signing identity in the user-supplied ZIP matches the
original 0.5.4 APK certificate, but should be treated as a pilot identity only.

## Important limitations

This is a *binary hotfix*, not source reconstruction. The v0.5.4 interface
still needs to be ported to maintainable React/TypeScript source. The normal
Android source build in this repo currently represents v0.4.0 and must **not**
replace the 0.5.5 pilot until parity is achieved. Do not advertise the CI
artifact as a production APK. Test guest onboarding, permission handling,
notifications, optional Clerk login, sign-out, and device updates on a real
Android device before broader distribution.