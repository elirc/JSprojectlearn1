import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Trie, buildTrie, byPopularity } from './trie.js';

const dictionary = () =>
  buildTrie({
    car: 90, card: 40, care: 30, careful: 5, cart: 25, carton: 3,
    cat: 80, cast: 10, do: 70, does: 20, dog: 95, dodge: 4,
    door: 35, Doorbell: 6, dot: 15, double: 8, down: 60,
    download: 50, Downtown: 7, draw: 12,
  });

test('suggests every word under a prefix, most popular first', () => {
  const trie = dictionary();
  assert.deepEqual(trie.suggest('car', 5), ['car', 'card', 'care', 'cart', 'careful']);
  assert.deepEqual(trie.suggest('cart', 5), ['cart', 'carton']);
});

test('an empty prefix means the whole dictionary, ranked', () => {
  const trie = dictionary();
  assert.deepEqual(trie.suggest('', 3), ['dog', 'car', 'cat']); // 95, 90, 80
  assert.equal(trie.suggest('', 100).length, 20);
});

test('a prefix nothing starts with returns an empty array, not undefined', () => {
  const trie = dictionary();
  assert.deepEqual(trie.suggest('z', 5), []);
  assert.deepEqual(trie.suggest('carrot', 5), []); // walks off the path mid-way
  assert.deepEqual(trie.suggest('cars', 5), []);
});

test('limit caps the results and 0 means none', () => {
  const trie = dictionary();
  assert.equal(trie.suggest('c', 3).length, 3);
  assert.equal(trie.suggest('c', 1).length, 1);
  assert.deepEqual(trie.suggest('c', 1), ['car']); // the best one, not the first found
  assert.deepEqual(trie.suggest('c', 0), []);
  assert.equal(trie.suggest('c', 999).length, 8); // fewer matches than the limit
});

test('a bad limit is rejected loudly', () => {
  const trie = dictionary();
  assert.throws(() => trie.suggest('c', -1), RangeError);
  assert.throws(() => trie.suggest('c', 2.5), RangeError);
});

test('matching is case-insensitive, but the original spelling comes back', () => {
  const trie = dictionary();
  assert.deepEqual(trie.suggest('doo', 5), ['door', 'Doorbell']);
  assert.deepEqual(trie.suggest('DOO', 5), ['door', 'Doorbell']); // the original's bug
  assert.deepEqual(trie.suggest('doorb', 5), ['Doorbell']);
  assert.equal(trie.has('DOORBELL'), true);
});

test('has() is about whole words, not prefixes', () => {
  const trie = dictionary();
  assert.equal(trie.has('car'), true);
  assert.equal(trie.has('ca'), false); // a real path, but no word ends there
  assert.equal(trie.has('cars'), false);
  assert.equal(trie.has('carton'), true);
});

test('a word that is a prefix of another survives both ways', () => {
  const trie = new Trie();
  trie.insert('do', 5).insert('door', 3).insert('doorbell', 1);
  assert.equal(trie.has('do'), true);
  assert.equal(trie.has('door'), true);
  assert.deepEqual(trie.suggest('do', 10), ['do', 'door', 'doorbell']);
  assert.deepEqual(trie.suggest('door', 10), ['door', 'doorbell']);
});

test('re-inserting a word updates it instead of duplicating it', () => {
  const trie = new Trie();
  trie.insert('cat', 1);
  assert.equal(trie.size, 1);
  trie.insert('cat', 99);
  assert.equal(trie.size, 1);
  assert.deepEqual(trie.suggest('ca', 10), ['cat']);
  trie.insert('car', 50);
  assert.deepEqual(trie.suggest('ca', 10), ['cat', 'car']); // 99 beats 50
});

test('equal weights break the tie alphabetically, not by luck', () => {
  const trie = new Trie();
  trie.insert('beta', 5).insert('alpha', 5).insert('gamma', 5);
  assert.deepEqual(trie.suggest('', 10), ['alpha', 'beta', 'gamma']);
});

test('an empty trie answers everything with an empty array', () => {
  const trie = new Trie();
  assert.equal(trie.size, 0);
  assert.deepEqual(trie.suggest('', 10), []);
  assert.deepEqual(trie.suggest('anything', 10), []);
  assert.equal(trie.has('anything'), false);
});

test('junk input is rejected at the door', () => {
  const trie = new Trie();
  assert.throws(() => trie.insert(''), RangeError);
  assert.throws(() => trie.insert(42), TypeError);
  assert.throws(() => trie.insert('ok', 'heavy'), TypeError);
  assert.throws(() => trie.suggest(null), TypeError);
});

test('shared prefixes are stored once — 200 words, one path', () => {
  const trie = new Trie();
  for (let i = 0; i < 200; i++) trie.insert(`prefix${i}`, i);
  assert.equal(trie.size, 200);
  assert.equal(trie.suggest('prefix', 1000).length, 200);
  assert.deepEqual(trie.suggest('prefix19', 1000).sort(), ['prefix19', ...Array.from({ length: 10 }, (_, d) => `prefix19${d}`)].sort());
  assert.deepEqual(trie.suggest('prefix199', 5), ['prefix199']);
});

test('byPopularity is exported so the ranking rule can be read and reused', () => {
  assert.ok(byPopularity({ word: 'a', weight: 9 }, { word: 'b', weight: 1 }) < 0);
  assert.ok(byPopularity({ word: 'a', weight: 5 }, { word: 'b', weight: 5 }) < 0);
  assert.equal(byPopularity({ word: 'a', weight: 5 }, { word: 'a', weight: 5 }), 0);
});
