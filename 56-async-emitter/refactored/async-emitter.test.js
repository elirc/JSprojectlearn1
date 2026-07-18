import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AsyncEmitter } from './async-emitter.js';

test('basic on/emitAsync/off still works (38 compatibility)', async () => {
  const bus = new AsyncEmitter();
  const seen = [];
  const off = bus.on('msg', (m) => seen.push(m));
  await bus.emitAsync('msg', 'a');
  off();
  await bus.emitAsync('msg', 'b');
  assert.deepEqual(seen, ['a']);
});

test('AbortSignal detaches a whole GROUP of subscriptions at once', async () => {
  const bus = new AsyncEmitter();
  const session = new AbortController();
  const seen = [];
  bus.on('message', (m) => seen.push(`msg:${m}`), { signal: session.signal });
  bus.on('typing', (u) => seen.push(`typing:${u}`), { signal: session.signal });

  await bus.emitAsync('message', 1);
  session.abort(); // disconnect: one call tears down the whole session
  await bus.emitAsync('message', 2);
  await bus.emitAsync('typing', 'ada');

  assert.deepEqual(seen, ['msg:1']);
  assert.equal(bus.listenerCount('message'), 0);
  assert.equal(bus.listenerCount('typing'), 0);
});

test('an already-aborted signal never subscribes at all', async () => {
  const bus = new AsyncEmitter();
  const ac = new AbortController();
  ac.abort();
  bus.on('x', () => { throw new Error('should never run'); }, { signal: ac.signal });
  await bus.emitAsync('x');
  assert.equal(bus.listenerCount('x'), 0);
});

test('the reconnect-leak scenario from the original, fixed', () => {
  const warnings = [];
  const bus = new AsyncEmitter({ maxListeners: 10, warn: (w) => warnings.push(w) });

  let current = null;
  function startSession(id) {
    current?.abort(); // tear down the previous session's subscriptions
    current = new AbortController();
    bus.on('message', () => {}, { signal: current.signal });
  }
  for (let i = 1; i <= 50; i++) startSession(i);

  assert.equal(bus.listenerCount('message'), 1); // the original climbed to 50
  assert.deepEqual(warnings, []);
});

test('leak smoke-alarm: exceeding maxListeners warns ONCE, naming the event', () => {
  const warnings = [];
  const bus = new AsyncEmitter({ maxListeners: 3, warn: (w) => warnings.push(w) });
  for (let i = 0; i < 6; i++) bus.on('data', () => {});
  assert.equal(warnings.length, 1); // once, not a warning-spam firehose
  assert.match(warnings[0], /"data"/);
  assert.match(warnings[0], /leak/i);
});

test('waitFor: awaiting an event beats polling for it', async () => {
  const bus = new AsyncEmitter();
  setTimeout(() => bus.emitAsync('connected', { user: 'ada' }), 10);
  const payload = await bus.waitFor('connected');
  assert.deepEqual(payload, { user: 'ada' });
  assert.equal(bus.listenerCount('connected'), 0); // waitFor cleans up after itself
});

test('waitFor with timeoutMs: the event never coming is an ERROR, not a hang', async () => {
  const bus = new AsyncEmitter();
  await assert.rejects(
    () => bus.waitFor('connected', { timeoutMs: 20 }),
    /Timed out after 20ms waiting for "connected"/,
  );
  assert.equal(bus.listenerCount('connected'), 0); // timeout also unsubscribes
});

test('emitAsync AWAITS async listeners — emit-then-done ordering is real', async () => {
  const bus = new AsyncEmitter();
  const order = [];
  bus.on('save', async () => {
    await new Promise((r) => setTimeout(r, 10));
    order.push('saved');
  });
  await bus.emitAsync('save');
  order.push('after emit');
  assert.deepEqual(order, ['saved', 'after emit']); // the original logged the reverse
});

test('async listener failures are COLLECTED, not unhandled rejections', async () => {
  const bus = new AsyncEmitter();
  const seen = [];
  bus.on('save', async () => { throw new Error('untitled docs are unsaveable'); });
  bus.on('save', async (doc) => { seen.push(doc); }); // still runs (isolation)
  bus.on('save', () => { throw new Error('sync throw'); }); // sync failure, same treatment

  await assert.rejects(
    () => bus.emitAsync('save', { id: 7 }),
    (err) => err instanceof AggregateError && err.errors.length === 2,
  );
  assert.deepEqual(seen, [{ id: 7 }]); // one bad listener never blocks the others
});
