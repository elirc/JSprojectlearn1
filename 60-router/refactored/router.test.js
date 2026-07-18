import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, hashToPath } from './router.js';

const routes = [
  { path: '/', name: 'home' },
  { path: '/users', name: 'users' },
  { path: '/users/:id', name: 'user' },
  { path: '/users/:id/posts/:postId', name: 'post' },
  { path: '/about', name: 'about' },
];

const nameOf = (m) => m?.route.name ?? null;

test('static routes match exactly', () => {
  assert.equal(nameOf(matchRoute(routes, '/')), 'home');
  assert.equal(nameOf(matchRoute(routes, '/about')), 'about');
  assert.equal(nameOf(matchRoute(routes, '/users')), 'users');
});

test(':params match ANY value — no case-per-user (the original\'s disease)', () => {
  assert.deepEqual(matchRoute(routes, '/users/7').params, { id: '7' });
  assert.deepEqual(matchRoute(routes, '/users/9999').params, { id: '9999' });
});

test('multiple params in one pattern', () => {
  const m = matchRoute(routes, '/users/7/posts/42');
  assert.equal(nameOf(m), 'post');
  assert.deepEqual(m.params, { id: '7', postId: '42' });
});

test('segment counts must agree: /users/7/x matches nothing', () => {
  assert.equal(matchRoute(routes, '/users/7/x'), null);
  assert.equal(matchRoute(routes, '/users/7/posts'), null);
});

test('unknown path returns null — a 404 the caller can render', () => {
  assert.equal(matchRoute(routes, '/nope'), null);
});

test('static segments are case-insensitive; param VALUES keep their case', () => {
  assert.equal(nameOf(matchRoute(routes, '/Users')), 'users'); // broke the original
  assert.deepEqual(matchRoute(routes, '/users/Ada').params, { id: 'Ada' });
});

test('param values are URL-decoded', () => {
  assert.deepEqual(matchRoute(routes, '/users/ada%20lovelace').params, { id: 'ada lovelace' });
});

test('first matching route wins (order = specificity control)', () => {
  const overlapping = [
    { path: '/users/new', name: 'new-user-form' },
    { path: '/users/:id', name: 'user' },
  ];
  assert.equal(nameOf(matchRoute(overlapping, '/users/new')), 'new-user-form');
  assert.equal(nameOf(matchRoute(overlapping, '/users/7')), 'user');
});

test('hashToPath normalizes every hash shape the browser produces', () => {
  assert.equal(hashToPath(''), '/');          // initial load, no hash
  assert.equal(hashToPath('#'), '/');
  assert.equal(hashToPath('#/'), '/');
  assert.equal(hashToPath('#/users/7'), '/users/7');
  assert.equal(hashToPath('#/users?sort=name'), '/users'); // query stripped
});
