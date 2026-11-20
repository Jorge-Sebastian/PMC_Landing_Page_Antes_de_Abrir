'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../lib/commercial');
test('Public aliases are stable, per-account, and not credentials', () => {
 const a=c.publicCustomerId('firebase-account-abcd-1111');
 assert.match(a,/^SG-[0-9A-F]{20}$/);
 assert.equal(a,c.publicCustomerId('firebase-account-abcd-1111'));
 assert.notEqual(a,c.publicCustomerId('firebase-account-abcd-2222'));
});
test('Free and expired trial never unlock Premium',()=>{
 assert.equal(c.effectiveAccess(null,100).plan,'free');
 assert.equal(c.effectiveAccess({plan:'trial',endsAt:100},100).plan,'free');
 assert.equal(c.effectiveAccess({plan:'trial',endsAt:101},100).plan,'trial');
 assert.equal(c.effectiveAccess({plan:'family',endsAt:101,revoked:true},100).plan,'free');
 assert.equal(c.effectiveAccess({plan:'individual',endsAt:101},100).paid,true);
});
test('Renewals preserve paid days; expired subscriptions start now',()=>{
 const now=Date.UTC(2026,10,17),end=now+12*c.DAY_MS;
 assert.equal(c.nextPaidExpiry({plan:'individual',endsAt:end},now),end+30*c.DAY_MS);
 assert.equal(c.nextPaidExpiry({plan:'trial',endsAt:end},now),now+30*c.DAY_MS);
 assert.equal(c.nextPaidExpiry({plan:'family',endsAt:now-1},now),now+30*c.DAY_MS);
});
test('Codes use a secure random payload with a deterministic lookup hash',()=>{
 const a=c.activationCode(),b=c.activationCode();
 assert.match(a,/^SGP-[A-F0-9]{24}$/);
 assert.notEqual(a,b);assert.equal(c.codeHash(a),c.codeHash(a.toLowerCase()));
 assert.throws(()=>c.codeHash('SG-FAKE'));
});
test('Payment reference cannot be reused with altered casing',()=>{
 assert.equal(c.paymentFingerprint(' ABC-123  '),c.paymentFingerprint('abc-123'));
 assert.throws(()=>c.paymentFingerprint('hi'));
});
test('Commercial terms stay centralized',()=>{
 assert.equal(c.MAX_FAMILY_MEMBERS,10);
 assert.equal(c.PLAN_COP.individual,9900);
 assert.equal(c.PLAN_COP.family,19900);
});

test('One family purchase covers invited seats without letting invitees become hosts',()=>{
 const room={hostUid:'host-01',members:{'host-01':{role:'host'},'guest-01':{role:'member'}}};
 const live={plan:'family',endsAt:500,revoked:false};
 const trial={plan:'trial',endsAt:500,revoked:false};
 assert.equal(c.inheritedFamilySeat(room,'guest-01',live,100).plan,'familyMember');
 assert.equal(c.inheritedFamilySeat(room,'guest-01',trial,100).hostPlan,'trial');
 assert.equal(c.inheritedFamilySeat(room,'stranger',live,100),null);
 assert.equal(c.inheritedFamilySeat(room,'guest-01',{plan:'individual',endsAt:500},100),null);
 assert.equal(c.inheritedFamilySeat(room,'guest-01',live,500),null);
 assert.equal(c.inheritedFamilySeat(room,'guest-01',{plan:'family',endsAt:500,revoked:true},100),null);
});

test('An existing personal plan survives a separate household invitation',()=>{
 const personal={plan:'individual',paid:true,trial:false,endsAt:'2026-12-01T00:00:00.000Z',features:{
   history:true,automatic:true,familyGroup:false,familySeats:0
 }};
 const invited={plan:'familyMember',paid:false,trial:false,endsAt:'2026-12-10T00:00:00.000Z',familySeat:true};
 const resolved=c.resolveHouseholdAccess(personal,invited);
 assert.equal(resolved.plan,'individual');
 assert.equal(resolved.ownPlan,'individual');
 assert.equal(resolved.paid,true);
 assert.equal(resolved.personalEndsAt,'2026-12-01T00:00:00.000Z');
 assert.equal(resolved.endsAt,'2026-12-10T00:00:00.000Z');
 assert.equal(resolved.familySeat,true);
 assert.equal(resolved.features.familyGroup,true);
 const personalOnly=c.resolveHouseholdAccess(personal,null);
 assert.equal(personalOnly.familySeat,false);
 assert.equal(personalOnly.plan,'individual');
});
