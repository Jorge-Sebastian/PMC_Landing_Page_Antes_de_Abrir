/** A *separate* Supabase project. Never send SmartGuard telemetry to Enter/personal/Subachoque. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SMARTGUARD_TELEMETRY_URL as string | undefined;
const key = import.meta.env.VITE_SMARTGUARD_TELEMETRY_PUBLISHABLE_KEY as string | undefined;
export const telemetryConfigured = !!(url && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key?.startsWith('sb_publishable_'));
let client: SupabaseClient | null = null;
export const telemetryClient = (): SupabaseClient | null => {
  if (!telemetryConfigured) return null;
  if (!client) client = createClient(url!, key!, {
    auth: { storageKey: 'smartguard-telemetry-session', persistSession: true, autoRefreshToken: true },
  });
  return client;
};
export const TELEMETRY_CONSENT_KEY = 'sg:opt-in-usage-telemetry:v1';
export const DEVICE_ID_KEY = 'sg:anonymous-installation:v1';
export const consentGiven = () => { try { return localStorage.getItem(TELEMETRY_CONSENT_KEY) === 'yes'; } catch { return false; } };
export const setConsent = (allow: boolean) => { try { if (allow) localStorage.setItem(TELEMETRY_CONSENT_KEY, 'yes'); else localStorage.removeItem(TELEMETRY_CONSENT_KEY); } catch { /* data remain local */ } };
export const getInstallationId = () => {
  try {
    const old = localStorage.getItem(DEVICE_ID_KEY);
    if (old && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(old)) return old;
    const generated = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch { return null; }
};
