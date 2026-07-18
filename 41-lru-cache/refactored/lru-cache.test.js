import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LruCache } from './lru-cache.js';

test('stores and retrieves within capacity', () => {
  const cache = new LruCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('missing'), undefined);
});

test('evicts the least recently used when full', () => {
  const cache = new LruCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  cache.set('d', 4); // 'a' is the oldest untouched entry
  assert.equal(cache.has('a'), false);
  assert.deepEqual(cache.keys(), ['b', 'c', 'd']);
});

test('THE point of LRU: a get() rescues a hot item from eviction', () => {
  const cache = new LruCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  cache.get('a');    // 'a' is hot — the original ignored this
  cache.set('d', 4); // so 'b' (coldest) is evicted, not 'a'
  assert.equal(cache.has('a'), true);
  assert.equal(cache.has('b'), false);
});

test('updating an existing key refreshes it and never duplicates', () => {
  const cache = new LruCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  cache.set('b', 22);         // update, not insert
  assert.equal(cache.size, 3); // the original's order array grew here
  cache.set('d', 4);           // evicts 'a' — 'b' was refreshed
  assert.equal(cache.get('b'), 22);
  assert.equal(cache.has('a'), false);
});

test('has() peeks without changing recency', () => {
  const cache = new LruCache(2);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.has('a');    // peek only — 'a' stays least recent
  cache.set('c', 3);
  assert.equal(cache.has('a'), false); // still evicted
});

test('capacity 1 works', () => {
  const cache = new LruCache(1);
  cache.set('a', 1);
  cache.set('b', 2);
  assert.deepEqual(cache.keys(), ['b']);
});

test('silly capacities are rejected', () => {
  assert.throws(() => new LruCache(0), RangeError);
  assert.throws(() => new LruCache(2.5), RangeError);
});
