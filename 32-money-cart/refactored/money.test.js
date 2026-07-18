import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCents, formatCents, cartTotalCents, applyDiscountCents } from './money.js';

test('the original bug, exactly: 3 x $10.35 + 2 x $0.10 = $31.25, EXACTLY', () => {
  const cart = [
    { name: 'coffee', priceCents: toCents('10.35'), quantity: 3 },
    { name: 'filter', priceCents: toCents('0.10'), quantity: 2 },
  ];
  assert.equal(cartTotalCents(cart), 3125); // not 3124.9999...
});

test('0.1 + 0.2 territory: ten dimes are exactly a dollar', () => {
  const dimes = Array.from({ length: 10 }, () => ({ priceCents: toCents(0.1), quantity: 1 }));
  assert.equal(cartTotalCents(dimes), 100);
});

test('toCents absorbs input float dust with one boundary rounding', () => {
  assert.equal(toCents(10.35), 1035); // 10.35 * 100 is 1034.9999... — rounded once
  assert.equal(toCents('19.99'), 1999);
  assert.equal(toCents(0), 0);
});

test('toCents rejects garbage', () => {
  assert.throws(() => toCents('ten dollars'), RangeError);
  assert.throws(() => toCents(Infinity), RangeError);
});

test('discounts hit thresholds exactly (the original missed by 4e-15)', () => {
  const total = 3125;
  const discounted = applyDiscountCents(total, 10);
  assert.equal(discounted, 2812); // 312.5 off rounds half-up to 313; 3125 - 313
  assert.ok(discounted >= 2812);  // threshold comparisons are now exact
});

test('formatCents renders currency', () => {
  assert.equal(formatCents(3125), '$31.25');
  assert.equal(formatCents(5), '$0.05');
  assert.equal(formatCents(123456789), '$1,234,567.89');
});

test('other currencies are a parameter, not a rewrite', () => {
  assert.equal(formatCents(3125, { locale: 'de-DE', currency: 'EUR' }).includes('31,25'), true);
});
