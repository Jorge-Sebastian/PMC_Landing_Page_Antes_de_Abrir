'use strict';

const fs = require('node:fs');
const {activationCode, codeHash} = require('../lib/commercial');
const plans = ['individual','family'];
const perPlan = 10;
const projectId = 'smartguard-piloto-20261029';
const header = 'plan,codigo';
const [action, file] = process.argv.slice(2);

function generate() {
  const codes = new Set();
  const rows = [header];
  for (const plan of plans) {
    for (let n = 0; n < perPlan; n++) {
      let code;
      do { code = activationCode(); } while (codes.has(code));
      codes.add(code);
      rows.push(plan + ',' + code);
    }
  }
  fs.writeFileSync(file, rows.join('\n') + '\n', {flag:'wx',mode:0o600});
  console.log('Created one private batch: 10 Individual and 10 Family.');
}

function readBatch() {
  const [columns, ...rows] = fs.readFileSync(file,'utf8').trim().split(/\r?\n/);
  if (columns !== header || rows.length !== perPlan * plans.length) throw new Error('Invalid pilot batch.');
  const codes = rows.map(row => {
    const [plan, code, extra] = row.split(',');
    if (extra !== undefined || !plans.includes(plan) || !/^SGP-[A-F0-9]{24}$/.test(code ?? '')) {
      throw new Error('Invalid code or plan in pilot batch.');
    }
    return {plan, hash:codeHash(code)};
  });
  if (new Set(codes.map(record => record.hash)).size !== codes.length
      || plans.some(plan => codes.filter(record => record.plan === plan).length !== perPlan)) {
    throw new Error('Expected ten unique codes per plan.');
  }
  return codes;
}

async function seed() {
  if (process.env.GOOGLE_CLOUD_PROJECT !== projectId || process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Select the intended Firebase project with GOOGLE_CLOUD_PROJECT before seeding.');
  }
  const {initializeApp} = require('firebase-admin/app');
  const {getFirestore, FieldValue} = require('firebase-admin/firestore');
  const codes = readBatch();
  const db = getFirestore(initializeApp({projectId}));
  const batch = db.batch();
  // A second import cannot add more codes or overwrite used entries. All writes are atomic.
  batch.create(db.doc('sg_config/pilot_codes_v1'), {count:codes.length, createdAt:FieldValue.serverTimestamp()});
  for (const {plan, hash} of codes) {
    batch.create(db.doc('sg_pilot_codes/' + hash), {plan, usedBy:null, redeemedAt:null});
  }
  await batch.commit();
  console.log('Registered 20 hashed pilot codes in Firebase.');
}

async function main() {
  if (!file || !['generate','seed'].includes(action)) throw new Error('Usage: node functions/scripts/pilot-codes.js generate|seed /private/path/codes.csv');
  if (action === 'generate') generate();
  else await seed();
}
main().catch(error => {
  console.error(action === 'seed' && error.code ? 'Firestore seeding failed (' + error.code + ').' : error.message);
  process.exitCode=1;
});
