import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestTrade } from './best-trade.js';

test('finds the classic case', () => {
  const result = bestTrade([110, 95, 100, 87, 92, 105, 102, 99]);
  assert.deepEqual(result, { buyDay: 3, sellDay: 5, profit: 18 });
});

test('buy must happen before sell', () => {
  // Lowest price is on the LAST day — can't buy there and sell earlier.
  const result = bestTrade([10, 30, 5]);
  assert.deepEqual(result, { buyDay: 0, sellDay: 1, profit: 20 });
});

test('prices that only fall mean no trade', () => {
  assert.equal(bestTrade([100, 90, 80, 70]), null);
});

test('flat prices mean no profitable trade', () => {
  assert.equal(bestTrade([50, 50, 50]), null);
});

test('too little data means no trade', () => {
  assert.equal(bestTrade([]), null);
  assert.equal(bestTrade([42]), null);
});

test('single pass matches brute force on random data', () => {
  // Cross-check the clever algorithm against the obvious one.
  const bruteForce = (prices) => {
    let best = null;
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const profit = prices[j] - prices[i];
        if (profit > (best?.profit ?? 0)) best = { buyDay: i, sellDay: j, profit };
      }
    }
    return best;
  };

  for (let trial = 0; trial < 50; trial++) {
    const prices = Array.from({ length: 30 }, () => Math.floor(Math.random() * 100));
    assert.deepEqual(bestTrade(prices), bruteForce(prices), `prices: ${prices}`);
  }
});
