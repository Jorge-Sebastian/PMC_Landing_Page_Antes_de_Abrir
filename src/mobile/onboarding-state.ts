/** Keeps previously-onboarded pilot users out of the new first-run guide. */
export const ONBOARDING_KEY = "smartguard:android:onboarding:v067";
export const LEGACY_WELCOME_KEY = "smartguard-native-welcome-v060";
export const PERMISSION_CONSENT_KEY = "smartguard-native-permission-consent-v060";

type Reader = { getItem(key: string): string | null };
type Writer = Reader & { setItem(key: string, value: string): void };

export function isOnboarded(store: Reader | null | undefined): boolean {
  if (!store) return true; // Never trap a user in onboarding when storage fails.
  try {
    return store.getItem(ONBOARDING_KEY) === "done" ||
      store.getItem(LEGACY_WELCOME_KEY) === "yes";
  } catch {
    return true;
  }
}

export function markOnboarded(store: Writer | null | undefined): void {
  if (!store) return;
  try {
    store.setItem(ONBOARDING_KEY, "done");
    store.setItem(LEGACY_WELCOME_KEY, "yes");
  } catch {
    // User can still use the app without writable local storage.
  }
}

export function hasNotificationConsent(store: Reader | null | undefined): boolean {
  if (!store) return false;
  try { return store.getItem(PERMISSION_CONSENT_KEY) === "yes"; }
  catch { return false; }
}

export function saveNotificationConsent(store: Writer | null | undefined, allowed: boolean): void {
  if (!store) return;
  try {
    if (allowed) store.setItem(PERMISSION_CONSENT_KEY, "yes");
    else if ("removeItem" in store && typeof store.removeItem === "function") store.removeItem(PERMISSION_CONSENT_KEY);
    else store.setItem(PERMISSION_CONSENT_KEY, "no");
  } catch {
    // Native consent must still be verified before enabling protection.
  }
}
