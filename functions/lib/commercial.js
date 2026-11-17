'use strict';
const { createHash, randomBytes } = require('node:crypto');
const DAY_MS = 86400000;
const TRIAL_DAYS = 15;
const PAID_DAYS = 30;
const MAX_FAMILY_MEMBERS = 10;
const PLAN_COP = Object.freeze({ individual: 9900, family: 19900 });
const PAID_PLANS = Object.freeze(Object.keys(PLAN_COP));

function asMillis(value) {
  if (!value) return NaN;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  return Date.parse(value);
}
function publicCustomerId(uid) {
  if (typeof uid !== 'string' || uid.length < 8) throw new Error('UID invalido');
  // Public lookup alias only. Never use the public ID as an authentication factor.
  return 'SG-' + createHash('sha256').update('smartguard-customer-v1:' + uid).digest('hex').slice(0,20).toUpperCase();
}
function effectiveAccess(entitlement, nowMs = Date.now()) {
  if (!entitlement || !['trial','individual','family'].includes(entitlement.plan)) return {plan:'free', paid:false, trial:false, endsAt:null};
  const ends = asMillis(entitlement.endsAt);
  if (!Number.isFinite(ends) || ends <= nowMs || entitlement.revoked === true) return {plan:'free', paid:false, trial:false, endsAt:null};
  const trial = entitlement.plan === 'trial';
  return {plan:entitlement.plan, paid:!trial, trial, endsAt:new Date(ends).toISOString()};
}
/** A Family subscription pays for its invited seats, not ten extra subscriptions.
 * A UID becomes an authorized guest only when it actually joined the room and
 * the host has a live Family subscription or live trial.
 */
function inheritedFamilySeat(room, uid, hostEntitlement, nowMs = Date.now()) {
  if (!room || typeof uid !== 'string' || !room.members
      || !Object.prototype.hasOwnProperty.call(room.members,uid)) return null;
  const host = effectiveAccess(hostEntitlement,nowMs);
  if (host.plan !== 'family' && host.plan !== 'trial') return null;
  return {plan:'familyMember',paid:false,trial:false,endsAt:host.endsAt,
    hostPlan:host.plan, familySeat:true};
}
function nextPaidExpiry(entitlement, nowMs = Date.now(), durationDays = PAID_DAYS) {
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) throw new Error('Duracion invalida');
  const existing = entitlement && ['individual','family'].includes(entitlement.plan) && entitlement.revoked !== true
    ? asMillis(entitlement.endsAt) : NaN;
  const from = Number.isFinite(existing) && existing > nowMs ? existing : nowMs;
  return from + durationDays * DAY_MS;
}
function activationCode() { return 'SGP-' + randomBytes(12).toString('hex').toUpperCase(); }
function codeHash(code) {
  const normalized = String(code || '').replace(/\s+/g, '').toUpperCase();
  if (!/^SGP-[A-F0-9]{24}$/.test(normalized)) throw new Error('Formato de codigo invalido');
  return createHash('sha256').update('smartguard-redeem-v1:' + normalized).digest('hex');
}
function paymentFingerprint(reference) {
  const normalized = String(reference || '').trim().toUpperCase().replace(/\s+/g,' ');
  if (normalized.length < 6 || normalized.length > 100 || !/^[A-Z0-9 ._-]+$/.test(normalized)) throw new Error('Referencia bancaria invalida');
  return createHash('sha256').update('smartguard-transfer-v1:' + normalized).digest('hex');
}
function operationId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{20,72}$/.test(value)) throw new Error('Identificador de operacion invalido');
  return value;
}
module.exports = {DAY_MS,TRIAL_DAYS,PAID_DAYS,MAX_FAMILY_MEMBERS,PLAN_COP,PAID_PLANS,publicCustomerId,effectiveAccess,inheritedFamilySeat,nextPaidExpiry,activationCode,codeHash,paymentFingerprint,operationId,asMillis};
