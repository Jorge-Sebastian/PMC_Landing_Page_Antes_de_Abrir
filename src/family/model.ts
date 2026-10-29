import { inspectUrlPrivacy } from '@/lib/link-analysis/url-privacy';

export type FamilyMember = {
  user_id: string;
  nickname: string;
  role: 'owner' | 'member';
  is_me: boolean;
  trusted_by_me: boolean;
};
export type FamilyAlert = {
  id: string;
  actor_id: string;
  recipient_id: string;
  event_type: 'help_requested' | 'continued_after_warning';
  origin: 'client_reported';
  domain: string | null;
  created_at: string;
  acknowledged_at: string | null;
};
export type Family = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  created_at: string;
  members: FamilyMember[];
  alerts: FamilyAlert[];
  invites_sent: number;
  invites_accepted: number;
};
export type FamilySnapshot = { families: Family[] };
export type FamilyEventType = FamilyAlert['event_type'];

/** Never put an original URL, message, query string or bearer token into a family event. */
export function safeDomainForFamily(url: string): string | null {
  if (inspectUrlPrivacy(url).sensitive) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.length <= 253 && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
  } catch {
    return null;
  }
}

export function parseFamilyDomain(domain: string | null): string | null {
  if (!domain || domain.length > 253) return null;
  const normalized = domain.toLowerCase().trim();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(normalized) ? normalized : null;
}

export function invitationLink(origin: string, token: string, demo = false): string {
  const url = new URL('/familia', origin);
  if (demo) url.searchParams.set('demo', '1');
  // URL fragments are not sent in HTTP requests or Referer headers.
  url.hash = `invitacion=${encodeURIComponent(token)}`;
  return url.toString();
}

export const demoFamily: FamilySnapshot = {
  families: [{
    id: 'familia-demo', name: 'Mi familia', role: 'owner',
    created_at: '2026-10-29T08:00:00Z', invites_sent: 2, invites_accepted: 1,
    members: [
      { user_id: 'demo-self', nickname: 'Tú', role: 'owner', is_me: true, trusted_by_me: false },
      { user_id: 'demo-mama', nickname: 'Mamá', role: 'member', is_me: false, trusted_by_me: true },
      { user_id: 'demo-abuelo', nickname: 'Abuelo', role: 'member', is_me: false, trusted_by_me: true },
    ],
    alerts: [{ id: 'alerta-demo', actor_id: 'demo-abuelo', recipient_id: 'demo-self',
      event_type: 'continued_after_warning', origin: 'client_reported', domain: 'ejemplo-sospechoso.test',
      created_at: '2026-10-29T07:40:00Z', acknowledged_at: null }],
  }],
};
