import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { cartReducer, initialCart, totalCents } from './cart.js';

// ---------- the reducer alone: pure business logic ------------------

test('reducer: add/remove items immutably', () => {
  const s1 = cartReducer(initialCart, { type: 'item/added', name: 'kb', priceCents: 4900 });
  const s2 = cartReducer(s1, { type: 'item/added', name: 'mouse', priceCents: 2900 });
  const s3 = cartReducer(s2, { type: 'item/removed', name: 'kb' });

  assert.deepEqual(s3.items.map((i) => i.name), ['mouse']);
  assert.deepEqual(initialCart.items, []); // originals untouched
  assert.deepEqual(s2.items.length, 2);
});

test('reducer: coupon rule lives in ONE place — invalid codes change nothing', () => {
  const valid = cartReducer(initialCart, { type: 'coupon/applied', code: 'SAVE10' });
  const invalid = cartReducer(initialCart, { type: 'coupon/applied', code: 'HAX' });
  assert.equal(valid.coupon, 0.9);
  assert.equal(invalid, initialCart); // same reference: nothing changed
});

test('derived data: total is computed, so it CANNOT go stale', () => {
  let s = initialCart;
  s = cartReducer(s, { type: 'item/added', name: 'kb', priceCents: 4900 });
  s = cartReducer(s, { type: 'item/added', name: 'mouse', priceCents: 2900 });
  s = cartReducer(s, { type: 'coupon/applied', code: 'SAVE10' });
  s = cartReducer(s, { type: 'item/removed', name: 'kb' });
  // The original showed a stale total here; a computed one can't:
  assert.equal(totalCents(s), Math.round(2900 * 0.9));
});

// ---------- the store: subscription mechanics ------------------------

test('subscribers are notified on every dispatch — rendering cannot be forgotten', () => {
  const store = createStore(cartReducer, initialCart);
  let renders = 0;
  store.subscribe(() => renders++);
  store.dispatch({ type: 'item/added', name: 'kb', priceCents: 100 });
  store.dispatch({ type: 'item/removed', name: 'kb' });
  assert.equal(renders, 2);
});

test('unsubscribe stops notifications (38\'s contract)', () => {
  const store = createStore(cartReducer, initialCart);
  let calls = 0;
  const off = store.subscribe(() => calls++);
  store.dispatch({ type: 'item/added', name: 'a', priceCents: 1 });
  off();
  store.dispatch({ type: 'item/added', name: 'b', priceCents: 1 });
  assert.equal(calls, 1);
});

test('dispatch validates actions', () => {
  const store = createStore(cartReducer, initialCart);
  assert.throws(() => store.dispatch(undefined), TypeError);
  assert.throws(() => store.dispatch({ noType: true }), TypeError);
});

// ---------- middleware: the onion ------------------------------------

test('middleware wraps dispatch in order: first middleware sees actions first', () => {
  const order = [];
  const tag = (name) => () => (next) => (action) => {
    order.push(name);
    return next(action);
  };
  const store = createStore(cartReducer, initialCart, [tag('logger'), tag('crash')]);
  store.dispatch({ type: 'item/added', name: 'kb', priceCents: 1 });
  assert.deepEqual(order, ['logger', 'crash']);
});

test('a logging middleware sees every action + the state after it', () => {
  const log = [];
  const logger = ({ getState }) => (next) => (action) => {
    const result = next(action);
    log.push({ type: action.type, count: getState().items.length });
    return result;
  };
  const store = createStore(cartReducer, initialCart, [logger]);
  store.dispatch({ type: 'item/added', name: 'kb', priceCents: 1 });
  store.dispatch({ type: 'item/removed', name: 'kb' });
  assert.deepEqual(log, [
    { type: 'item/added', count: 1 },
    { type: 'item/removed', count: 0 },
  ]);
});

test('a "thunk" middleware turns function-actions into async workflows', async () => {
  const thunk = ({ dispatch, getState }) => (next) => (action) =>
    typeof action === 'function' ? action(dispatch, getState) : next(action);

  const store = createStore(cartReducer, initialCart, [thunk]);
  await store.dispatch(async (dispatch) => {
    await new Promise((r) => setTimeout(r, 5)); // "fetch" the price
    dispatch({ type: 'item/added', name: 'kb', priceCents: 4900 });
  });
  assert.equal(totalCents(store.getState()), 4900);
});
