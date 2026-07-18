import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deepEqual } from './deep-equal.js';

test('primitives compare by value', () => {
  assert.equal(deepEqual(1, 1), true);
  assert.equal(deepEqual('a', 'a'), true);
  assert.equal(deepEqual(1, '1'), false); // strict: no type coercion
  assert.equal(deepEqual(null, undefined), false);
});

test('key order does not matter (the JSON approach failed this)', () => {
  assert.equal(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
});

test('an explicit undefined value is not a missing key (JSON failed this too)', () => {
  assert.equal(deepEqual({ a: undefined }, {}), false);
});

test('NaN equals NaN, and does NOT equal null', () => {
  assert.equal(deepEqual(NaN, NaN), true);
  assert.equal(deepEqual({ x: NaN }, { x: null }), false);
});

test('nested structures compare recursively', () => {
  assert.equal(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), true);
  assert.equal(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] }), false);
});

test('arrays and objects are different kinds, even when keys match', () => {
  assert.equal(deepEqual([1, 2], { 0: 1, 1: 2 }), false);
});

test('dates compare by timestamp', () => {
  assert.equal(deepEqual(new Date(1000), new Date(1000)), true);
  assert.equal(deepEqual(new Date(1000), new Date(2000)), false);
  assert.equal(deepEqual(new Date(0), {}), false);
});

test('extra keys mean not equal, in either direction', () => {
  assert.equal(deepEqual({ a: 1 }, { a: 1, b: 2 }), false);
  assert.equal(deepEqual({ a: 1, b: 2 }, { a: 1 }), false);
});

test('same reference is always equal (even a cyclic one)', () => {
  const loop = {};
  loop.self = loop;
  assert.equal(deepEqual(loop, loop), true); // Object.is short-circuits
});
