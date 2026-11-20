'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {HttpsError} = require('firebase-functions/v2/https');
const {createHttpHandler} = require('../lib/http');
const {createOperations} = require('../lib/operations');

const endpoint = 'https://smartguard.example/api/smartguard-commercial';
const origin = 'https://localhost';

function post(operation, data, headers = {}) {
  return new Request(endpoint, {
    method:'POST',
    headers:{Authorization:'Bearer valid-token', 'Content-Type':'application/json', Origin:origin, ...headers},
    body:JSON.stringify({operation,data}),
  });
}
function fixture({enabled = true, operations, verifyIdToken} = {}) {
  return createHttpHandler({
    allowedOrigins:[origin],
    isEnabled:() => enabled,
    getServices:() => ({
      HttpsError,
      operations:operations ?? {sgGetAccess:request => ({plan:'free', uid:request.auth.uid})},
      verifyIdToken:verifyIdToken ?? (async token => {
        if (token !== 'valid-token') throw Object.assign(new Error('revoked'), {code:'auth/id-token-revoked'});
        return {uid:'server-uid'};
      }),
    }),
  });
}

test('HTTP uses only the verified Firebase UID and disables caching', async () => {
  const response = await fixture()(post('sgGetAccess', {uid:'client-uid'}));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {data:{plan:'free',uid:'server-uid'}});
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
});

test('HTTP rejects missing/revoked sessions, unknown operations and disabled deployments', async () => {
  const handle = fixture();
  assert.equal((await handle(post('sgGetAccess', {}, {Authorization:''}))).status, 401);
  assert.equal((await handle(post('sgGetAccess', {}, {Authorization:'Bearer revoked-token'}))).status, 401);
  assert.equal((await handle(post('constructor', {}))).status, 404);
  assert.equal((await fixture({enabled:false})(post('sgGetAccess', {}))).status, 503);
});

test('HTTP rejects unapproved browser origins and oversized input', async () => {
  const handle = fixture();
  assert.equal((await handle(post('sgGetAccess', {}, {Origin:'https://other.example'}))).status, 403);
  const preflight = await handle(new Request(endpoint, {method:'OPTIONS',headers:{Origin:origin}}));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Headers'), 'Authorization, Content-Type');
  assert.equal((await handle(post('sgGetAccess', {extra:'x'.repeat(8192)}))).status, 400);
  assert.equal((await handle(post('sgGetAccess', null))).status, 400);
});

test('the actual payment operation denies a verified but unauthorized administrator', async () => {
  const auth = {getUser:async () => ({emailVerified:true,disabled:false})};
  const db = {doc:path => {
    assert.equal(path, 'admins/server-uid');
    return {get:async () => ({exists:false})};
  }};
  const handle = fixture({operations:createOperations(db, auth)});
  const response = await handle(post('sgAdminGrantPlan', {uid:'client-uid',bankVerified:true}));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'permission-denied');
});
