'use strict';

const MAX_BODY_BYTES = 8192;
const errorStatuses = {
  'already-exists': 409,
  'failed-precondition': 400,
  'invalid-argument': 400,
  'not-found': 404,
  'permission-denied': 403,
  unauthenticated: 401,
};

async function readBody(request) {
  if (!request.body) throw new Error('Missing body');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', {fatal:true});
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(value, {stream:true});
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

function createHttpHandler({getServices, isEnabled, allowedOrigins, allowSameOrigin = false}) {
  const origins = new Set(allowedOrigins);
  return async function handle(request) {
    const headers = new Headers({'Cache-Control':'no-store', Vary:'Origin'});
    const origin = request.headers.get('origin');
    const fail = (status, code, message) => Response.json({error:{code,message}}, {status,headers});

    if (origin) {
      if (!origins.has(origin) && !(allowSameOrigin && origin === new URL(request.url).origin)) {
        return fail(403, 'permission-denied', 'Origen no autorizado.');
      }
      headers.set('Access-Control-Allow-Origin', origin);
    }
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      return new Response(null, {status:204, headers});
    }
    if (request.method !== 'POST') {
      headers.set('Allow', 'POST, OPTIONS');
      return fail(405, 'method-not-allowed', 'Método no permitido.');
    }
    if (!isEnabled()) return fail(503, 'unavailable', 'Servicio comercial no habilitado.');
    const token = /^Bearer ([A-Za-z0-9._-]{1,8192})$/i.exec(request.headers.get('authorization') ?? '')?.[1];
    if (!token) return fail(401, 'unauthenticated', 'Inicia sesión en SmartGuard.');
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
      return fail(415, 'invalid-argument', 'El cuerpo debe estar en formato JSON.');
    }

    let body;
    try {
      body = await readBody(request);
    } catch {
      return fail(400, 'invalid-argument', 'JSON no válido.');
    }
    if (body === null) return fail(400, 'invalid-argument', 'Cuerpo vacío o demasiado grande.');
    const {operation, data} = body;
    if (typeof operation !== 'string' || typeof data !== 'object' || data === null || Array.isArray(data)) {
      return fail(400, 'invalid-argument', 'Operación o datos no válidos.');
    }
    try {
      const {verifyIdToken, operations, HttpsError} = getServices();
      if (!Object.hasOwn(operations, operation)) return fail(404, 'not-found', 'Operación no disponible.');
      let auth;
      try {
        auth = await verifyIdToken(token);
      } catch (error) {
        if (['auth/argument-error','auth/invalid-id-token','auth/id-token-expired','auth/id-token-revoked',
          'auth/user-disabled','auth/user-not-found'].includes(error?.code)) {
          return fail(401, 'unauthenticated', 'La sesión ya no es válida. Inicia sesión de nuevo.');
        }
        throw error;
      }
      try {
        const result = await operations[operation]({auth:{uid:auth.uid, token:auth},data});
        return Response.json({data:result}, {headers});
      } catch (error) {
        if (error instanceof HttpsError && Object.hasOwn(errorStatuses, error.code)) {
          return fail(errorStatuses[error.code], error.code, error.message);
        }
        throw error;
      }
    } catch (error) {
      console.error('SmartGuard commercial request failed', {code:error?.code ?? 'internal'});
      return fail(500, 'internal', 'No fue posible completar la operación.');
    }
  };
}

module.exports = {createHttpHandler};
