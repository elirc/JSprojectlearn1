// Integration: the composed system, exercised end to end. The "browser"
// here is project 67's own frame codec riding a raw TCP socket — the
// protocol we built is now our test tool.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createCollabServer } from './server.js';
import { decodeFrames, OPCODES } from '../../67-websocket-chat/refactored/frames.js';

let server, port, base;

before(async () => {
  server = createCollabServer(0);
  await new Promise((r) => server.on('listening', r));
  port = server.address().port;
  base = `http://localhost:${port}`;
});

after(() => server.close());

const post = (path, body) => fetch(base + path, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

/** A minimal WebSocket client: handshake, then collect text frames. */
function wsClient(since = 0) {
  return new Promise((resolve) => {
    const socket = net.connect(port, 'localhost', () => {
      socket.write([
        `GET /?since=${since} HTTP/1.1`, `Host: localhost:${port}`,
        'Upgrade: websocket', 'Connection: Upgrade',
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version: 13',
        '', '',
      ].join('\r\n'));
    });

    const events = [];
    let pending = Buffer.alloc(0);
    let upgraded = false;

    socket.on('data', (chunk) => {
      if (!upgraded) {
        const text = chunk.toString();
        const headerEnd = text.indexOf('\r\n\r\n');
        assert.match(text, /101 Switching Protocols/);
        upgraded = true;
        chunk = chunk.subarray(Buffer.byteLength(text.slice(0, headerEnd + 4)));
      }
      const out = decodeFrames(Buffer.concat([pending, chunk]));
      pending = out.rest;
      for (const f of out.frames) {
        if (f.opcode === OPCODES.TEXT) events.push(JSON.parse(f.payload.toString()));
      }
    });

    setTimeout(() => resolve({ events, close: () => socket.destroy() }), 150);
  });
}

test('a mutation over HTTP is pushed to a connected WebSocket client', async () => {
  const client = await wsClient(); // connected before the change
  await post('/todos', { title: 'first shared todo', originTag: 't1' });
  await new Promise((r) => setTimeout(r, 100)); // let the frame arrive

  const upserts = client.events.filter((e) => e.type === 'upsert');
  assert.ok(upserts.some((e) => e.todo.title === 'first shared todo'));
  assert.equal(upserts.at(-1).originTag, 't1'); // tags echo back for reconciliation
  client.close();
});

test('late joiners catch up via ?since= replay', async () => {
  await post('/todos', { title: 'made before you arrived', originTag: 't2' });
  const client = await wsClient(0); // connects AFTER the change
  assert.ok(client.events.some((e) => e.todo?.title === 'made before you arrived'));
  client.close();
});

test('the /events endpoint serves the same log over plain HTTP', async () => {
  const all = await (await fetch(`${base}/events?since=0`)).json();
  assert.ok(all.length >= 2);
  assert.deepEqual(all.map((e) => e.version), all.map((_, i) => i + 1)); // 1,2,3... no gaps
  const since = await (await fetch(`${base}/events?since=${all.length - 1}`)).json();
  assert.equal(since.length, 1); // only what you're missing
});

test('validation still guards the door (project 65 lives on)', async () => {
  const res = await post('/todos', { title: '' });
  assert.equal(res.status, 400);
  assert.ok((await res.json()).error);
});
