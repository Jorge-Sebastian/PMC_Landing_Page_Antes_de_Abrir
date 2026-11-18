'use strict';

const {onCall} = require('firebase-functions/v2/https');
const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore} = require('firebase-admin/firestore');
const {createOperations} = require('./lib/operations');

const app = initializeApp();
const operations = createOperations(getFirestore(app), getAuth(app));
const options = {region:'us-central1', maxInstances:8, memory:'256MiB'};
for (const [name, handler] of Object.entries(operations)) {
  exports[name] = onCall(options, handler);
}
