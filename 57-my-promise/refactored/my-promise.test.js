import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MyPromise } from './my-promise.js';

// MyPromise is a thenable, so real await works on it — the tests
// exercise MyPromise THROUGH the platform's own async machinery.

test('resolves asynchronously', async () => {
  const p = new MyPromise((resolve) => setTimeout(() => resolve(42), 5));
  assert.equal(await p, 42);
});

test('LATE subscribers fire too (the original\'s never-prints bug)', async () => {
  const p = new MyPromise((resolve) => resolve('early'));
  await new Promise((r) => setTimeout(r, 5)); // long after settling
  assert.equal(await p.then((v) => v + '!'), 'early!');
});

test('settling is final: second resolve/reject are ignored', async () => {
  let calls = 0;
  const p = new MyPromise((resolve, reject) => {
    resolve(1);
    resolve(2);       // ignored
    reject(new Error('too late')); // ignored
  });
  p.then(() => calls++);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(calls, 1);
  assert.equal(await p, 1);
});

test('handlers run on the microtask queue, never synchronously', async () => {
  const order = [];
  const p = MyPromise.resolve('x');
  p.then(() => order.push('handler'));
  order.push('after then'); // must run FIRST — then() never runs anything now
  await p;
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(order, ['after then', 'handler']);
});

test('chaining transforms values through a pipeline', async () => {
  const result = await MyPromise.resolve(2)
    .then((n) => n * 10)
    .then((n) => n + 1);
  assert.equal(result, 21);
});

test('a handler returning a MyPromise is ADOPTED (flattening, not nesting)', async () => {
  const result = await MyPromise.resolve('a')
    .then((v) => new MyPromise((resolve) => setTimeout(() => resolve(v + 'b'), 5)))
    .then((v) => v + 'c');
  assert.equal(result, 'abc');
});

test('a throwing executor rejects', async () => {
  await assert.rejects(
    async () => { await new MyPromise(() => { throw new Error('boom'); }); },
    /boom/,
  );
});

test('a throwing HANDLER rejects the next promise in the chain', async () => {
  await assert.rejects(
    async () => {
      await MyPromise.resolve(1).then(() => { throw new Error('mid-chain'); });
    },
    /mid-chain/,
  );
});

test('errors SKIP fulfillment handlers and land in catch', async () => {
  const hops = [];
  const result = await MyPromise.reject(new Error('original failure'))
    .then((v) => { hops.push('skipped 1'); return v; })
    .then((v) => { hops.push('skipped 2'); return v; })
    .catch((err) => `caught: ${err.message}`);
  assert.deepEqual(hops, []);
  assert.equal(result, 'caught: original failure');
});

test('catch RECOVERS: the chain continues fulfilled after it', async () => {
  const result = await MyPromise.reject(new Error('x'))
    .catch(() => 'recovered')
    .then((v) => v + ' and continued');
  assert.equal(result, 'recovered and continued');
});

test('then with non-function args passes values through (the chain hole)', async () => {
  assert.equal(await MyPromise.resolve(7).then().then(null, () => 'nope'), 7);
});

test('adopts a plain thenable (not just MyPromise instances)', async () => {
  const thenable = { then: (resolve) => setTimeout(() => resolve('from thenable'), 5) };
  assert.equal(await MyPromise.resolve(thenable), 'from thenable');
});

test('a misbehaving thenable that calls resolve twice settles once', async () => {
  let calls = 0;
  const sneaky = { then: (resolve) => { resolve('first'); resolve('second'); } };
  const p = MyPromise.resolve(sneaky);
  p.then(() => calls++);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(calls, 1);
  assert.equal(await p, 'first');
});
