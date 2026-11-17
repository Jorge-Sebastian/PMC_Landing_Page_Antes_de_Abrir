/**
 * Single client-side presentation contract for SmartGuard plans.
 * These functions never authorize backend writes; Firebase rules + callable are authoritative.
 */
import type { CommercialAccess, CommercialPlan } from './commercial-client';
import { ALL_TABS, BASIC_TABS, type MobileTab } from './access-navigation';

export function planAllowsAutomatic(plan: CommercialPlan): boolean {
  return plan === 'trial' || plan === 'individual' || plan === 'family';
}
export function planAllowsFamily(plan: CommercialPlan): boolean {
  return plan === 'trial' || plan === 'family';
}
export function commercialTabs(access: CommercialAccess | null): readonly MobileTab[] {
  if (!access || !planAllowsAutomatic(access.plan)) return BASIC_TABS;
  return ALL_TABS;
}
export function confirmedPremium(access: CommercialAccess | null): boolean {
  return Boolean(access && access.registered && access.features?.automatic && planAllowsAutomatic(access.plan)
    && access.endsAt && new Date(access.endsAt).getTime() > Date.now());
}
export function confirmedFamily(access: CommercialAccess | null): boolean {
  return Boolean(confirmedPremium(access) && access?.features?.familyGroup && planAllowsFamily(access.plan));
}
