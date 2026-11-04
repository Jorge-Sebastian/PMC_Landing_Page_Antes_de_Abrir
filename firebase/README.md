# Firebase Firestore rules (SmartGuard piloto)

The baseline in `firestore.rules` is the original safely deployed 2026-10-29 contract copied from `SmartGuard-Firebase-configuracion.zip`. It preserves the original devices/analyses/admins. This addition enables only `family_rooms` + `risk_events` (as the rules permit). Firebase Hosting is intentionally NOT defined in this repository's firebase.json: never overwrite the current admin website.

See `../docs/SMARTGUARD-FAMILY-FIREBASE-V1.md` for setup and limitations.
