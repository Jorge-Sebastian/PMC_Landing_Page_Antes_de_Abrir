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
