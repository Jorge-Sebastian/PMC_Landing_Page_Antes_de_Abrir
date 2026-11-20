/**
 * Single client-side presentation contract for SmartGuard plans.
 * These functions never authorize backend writes; Firebase rules + callable are authoritative.
 */
import type { CommercialAccess, CommercialPlan } from './commercial-client';
import { ALL_TABS, BASIC_TABS, type MobileTab } from './access-navigation';

export function planAllowsAutomatic(plan: CommercialPlan): boolean {
  return plan === 'trial' || plan === 'individual' || plan === 'family' || plan === 'familyMember';
}
export function planAllowsFamily(plan: CommercialPlan): boolean {
  return plan === 'trial' || plan === 'family' || plan === 'familyMember';
}
export function commercialTabs(access: CommercialAccess | null): readonly MobileTab[] {
  if (!confirmedPremium(access)) return [...BASIC_TABS, 'family'];
  return ALL_TABS;
}
export function confirmedPremium(access: CommercialAccess | null): boolean {
  return Boolean(access && access.registered && access.features?.automatic && planAllowsAutomatic(access.plan)
    && access.endsAt && new Date(access.endsAt).getTime() > Date.now());
}
export function confirmedFamily(access: CommercialAccess | null): boolean {
  if (!confirmedPremium(access) || !access?.features?.familyGroup) return false;
  // A customer who also owns a Family subscription retains those rights even
  // when an unrelated household invitation expires.
  const ownPlan = access.ownPlan ?? access.plan;
  if (ownPlan === 'trial' || ownPlan === 'family') {
    const validUntil = access.personalEndsAt ?? access.endsAt;
    if (validUntil && new Date(validUntil).getTime() > Date.now()) return true;
  }
  if (access.familySeat === true) {
    return Boolean(access.familySeatExpiresAt && new Date(access.familySeatExpiresAt).getTime() > Date.now());
  }
  return false;
}
