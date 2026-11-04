import { inspectUrlPrivacy } from '@/lib/link-analysis/url-privacy';
import { splitHost } from '@/lib/link-analysis/analyze-url';

/** Only RED results, with explicit FAMILY consent, may enter the shared room. */
export const MAX_FAMILY_ROOM_MEMBERS = 12;
export type FamilyRiskSource = 'notification' | 'manual';
export type FamilyRiskEvent = {
  id: string;
  memberId: string;
  memberNickname: string;
  registrableDomain: string;
  observedAt: string;
  source: FamilyRiskSource;
  level: 'red';
};
export type RedEventInput = {
  url: string;
  memberId: string;
  memberNickname: string;
  observedAt: string;
  source: FamilyRiskSource;
  level: 'red' | 'orange' | 'green';
  familySharingAllowed: boolean;
};
/** Retain only the registrable domain; no query, path, URL or message. */
export function normaliseRiskDomain(input: string): string | null {
  const host = input.trim().toLowerCase().replace(/\.$/, '');
  if (!host || host.length > 253 || !/^[a-z0-9.-]+$/.test(host) || host.includes('..')) return null;
  const parts = splitHost(host);
  if (!parts.suffix || !parts.registrable || parts.core.length < 3) return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(parts.registrable)) return null;
  return parts.registrable;
}
export function createConsentedFamilyRiskEvent(input: RedEventInput): Omit<FamilyRiskEvent,'id'> | null {
  if (input.level !== 'red' || !input.familySharingAllowed) return null;
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(input.memberId)) return null;
  const nickname = input.memberNickname.trim().replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, 48);
  if (!nickname || !Number.isFinite(Date.parse(input.observedAt))) return null;
  if (input.source !== 'manual' && input.source !== 'notification') return null;
  if (inspectUrlPrivacy(input.url).sensitive) return null;
  let parsed: URL;
  try { parsed = new URL(input.url); } catch { return null; }
  const registrableDomain = normaliseRiskDomain(parsed.hostname);
  if (!registrableDomain) return null;
  return {
    memberId: input.memberId,
    memberNickname: nickname,
    registrableDomain,
    observedAt: new Date(input.observedAt).toISOString(),
    source: input.source,
    level: 'red',
  };
}
/** The anonymous Firebase UID, never the nickname, occupies a seat. */
export function roomCapacity(activeMemberIds: readonly string[], joiningUid: string) {
  const ids = new Set(activeMemberIds.filter(Boolean));
  const alreadyMember = ids.has(joiningUid);
  return {
    allowed: alreadyMember || ids.size < MAX_FAMILY_ROOM_MEMBERS,
    alreadyMember,
    remainingSeats: Math.max(0,MAX_FAMILY_ROOM_MEMBERS-ids.size),
  };
}
