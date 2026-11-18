'use strict';

const {createServer} = require('node:http');
const {Readable} = require('node:stream');
const {createBackend} = require('./lib/backend');

const route = '/api/smartguard-commercial';
const handle = createBackend();
createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url, 'http://localhost');
  if (url.pathname !== route) {
    outgoing.writeHead(404).end();
    return;
  }
  try {
    const acceptsBody = incoming.method !== 'GET' && incoming.method !== 'HEAD' && incoming.method !== 'OPTIONS';
    const request = new Request(url, {
      method:incoming.method,
      headers:incoming.headers,
      ...(acceptsBody ? {body:Readable.toWeb(incoming), duplex:'half'} : {}),
    });
    const response = await handle(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (!outgoing.headersSent) outgoing.writeHead(500);
    outgoing.end();
  }
}).listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
