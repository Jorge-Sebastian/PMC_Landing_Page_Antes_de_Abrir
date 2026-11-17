import { describe, expect, it } from "vitest";
import {
  hasNotificationConsent, isOnboarded, markOnboarded, ONBOARDING_KEY,
  LEGACY_WELCOME_KEY, PERMISSION_CONSENT_KEY, saveNotificationConsent,
} from "./onboarding-state";

function makeStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, val: string) => { values.set(key, val); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
describe("Android first-run guide state", () => {
  it("completes the refreshed seven-screen tour", () => {
    const s = makeStore();
    expect(isOnboarded(s)).toBe(false);
    markOnboarded(s);
    expect(isOnboarded(s)).toBe(true);
    expect(s.getItem(ONBOARDING_KEY)).toBe("done");
    expect(s.getItem(LEGACY_WELCOME_KEY)).toBe("yes");
  });
  it("shows the new tour once to users of older pilot versions without clearing their settings", () => {
    const s = makeStore();
    s.setItem(LEGACY_WELCOME_KEY, "yes");
    expect(isOnboarded(s)).toBe(false);
    markOnboarded(s);
    expect(isOnboarded(s)).toBe(true);
    expect(s.getItem(LEGACY_WELCOME_KEY)).toBe("yes");
  });
  it("does not confuse consent to read notifications with onboarding", () => {
    const s = makeStore();
    markOnboarded(s);
    expect(hasNotificationConsent(s)).toBe(false);
    saveNotificationConsent(s, true);
    expect(s.getItem(PERMISSION_CONSENT_KEY)).toBe("yes");
    saveNotificationConsent(s, false);
    expect(hasNotificationConsent(s)).toBe(false);
  });
  it("does not trap a user when local storage is inaccessible", () => {
    expect(isOnboarded(null)).toBe(true);
    expect(isOnboarded({getItem:()=>{throw Error("blocked");}})).toBe(true);
  });
});
