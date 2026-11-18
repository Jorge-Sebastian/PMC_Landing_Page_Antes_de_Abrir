'use strict';

const {applicationDefault, cert, initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore} = require('firebase-admin/firestore');
const {HttpsError} = require('firebase-functions/v2/https');
const {createOperations} = require('./operations');
const {createHttpHandler} = require('./http');

const projectId = 'smartguard-piloto-20261029';
let services;
function getServices() {
  if (!services) {
    const encoded = process.env.SG_FIREBASE_CREDENTIALS_B64;
    const key = encoded ? JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) : null;
    if (key && key.project_id !== projectId) throw new Error('Proyecto de credenciales incorrecto.');
    const app = initializeApp({projectId, credential:key ? cert(key) : applicationDefault()}, 'commercial-http');
    const auth = getAuth(app);
    services = {
      HttpsError,
      verifyIdToken: token => auth.verifyIdToken(token, true),
      operations: createOperations(getFirestore(app), auth),
    };
  }
  return services;
}

function createBackend({allowSameOrigin = false} = {}) {
  return createHttpHandler({
    getServices,
    isEnabled: () => process.env.SG_COMMERCIAL_API_ENABLED === 'true',
    allowedOrigins: [
      'https://pmc-landing-page-antes-de-abrir.vercel.app',
      'https://localhost',
      ...(process.env.SG_COMMERCIAL_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean),
    ],
    allowSameOrigin,
  });
}

module.exports = {createBackend};
