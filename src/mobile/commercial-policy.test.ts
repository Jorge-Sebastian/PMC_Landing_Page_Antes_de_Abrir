import { describe, expect, it } from 'vitest';
import { ALL_TABS, BASIC_TABS } from './access-navigation';
import { commercialTabs, confirmedFamily, confirmedPremium, planAllowsFamily } from './commercial-policy';
import type { CommercialAccess, CommercialPlan } from './commercial-client';
const future=new Date(Date.now()+15*86_400_000).toISOString();
function access(plan:CommercialPlan,endsAt:string|null=future): CommercialAccess {
  return {uid:'test',publicId:'SG-TEST',registered:true,trialUsed:plan!=='free',
    plan,paid:plan==='individual'||plan==='family',trial:plan==='trial',
    endsAt,features:{history:plan!=='free',automatic:plan!=='free',
      familyGroup:plan==='trial'||plan==='family',familySeats:plan==='trial'||plan==='family'?10:0}};
}
describe('real commercial navigation never follows mock preview',()=>{
 it('locks premium when account is absent, free or expired',()=>{
   expect(commercialTabs(null)).toEqual(BASIC_TABS);
   expect(commercialTabs(access('free'))).toEqual(BASIC_TABS);
   expect(confirmedPremium(null)).toBe(false);
   expect(confirmedPremium(access('trial','2020-01-01T00:00:00Z'))).toBe(false);
 });
 it('lets valid trials use Family but not individual subscribers',()=>{
   expect(confirmedFamily(access('trial'))).toBe(true);
   expect(confirmedFamily(access('family'))).toBe(true);
   expect(confirmedFamily(access('individual'))).toBe(false);
   expect(planAllowsFamily('individual')).toBe(false);
 });
 it('individual Premium unlocks personal history but not family membership',()=>{
   expect(commercialTabs(access('individual'))).toEqual(ALL_TABS);
   expect(confirmedPremium(access('individual'))).toBe(true);
 });
 it('invalid entitlement response fails closed',()=>{
   const mutated={...access('family'),registered:false};
   expect(confirmedPremium(mutated)).toBe(false);
   expect(confirmedFamily(mutated)).toBe(false);
 });
});
