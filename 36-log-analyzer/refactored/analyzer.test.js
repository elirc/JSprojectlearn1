import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine, parseLog, analyze } from './analyzer.js';

const SAMPLE = [
  '2026-07-09T10:00:00Z [INFO] /home 200 12ms',
  '2026-07-09T10:00:01Z [ERROR] /api/users 503 1240ms',
  '2026-07-09T10:00:02Z [WARN] /api/orders 429 87ms',
  '2026-07-09T10:00:03Z [ERROR] /api/users 500 2310ms',
  '2026-07-09T10:00:04Z [INFO] /checkout 200 340ms',
].join('\n');

test('parseLine produces a typed object', () => {
  assert.deepEqual(parseLine('2026-07-09T10:00:01Z [ERROR] /api/users 503 1240ms'), {
    timestamp: '2026-07-09T10:00:01Z',
    level: 'ERROR',
    path: '/api/users',
    status: 503,        // a number, not "503"
    durationMs: 1240,   // a number, not "1240ms"
  });
});

test('malformed lines give null, never a half-parse', () => {
  assert.equal(parseLine('total garbage'), null);
  assert.equal(parseLine('2026-07-09 [ERROR] /x 503'), null); // missing duration
  assert.equal(parseLine(''), null);
});

test('parseLog separates entries from junk instead of hiding it', () => {
  const { entries, malformed } = parseLog(SAMPLE + '\n???corrupted???\n');
  assert.equal(entries.length, 5);
  assert.deepEqual(malformed, ['???corrupted???']);
});

test('analyze counts by level', () => {
  const { entries } = parseLog(SAMPLE);
  const report = analyze(entries);
  assert.equal(report.total, 5);
  assert.equal(report.byLevel.get('ERROR'), 2);
  assert.equal(report.byLevel.get('INFO'), 2);
  assert.equal(report.byLevel.get('WARN'), 1);
});

test('analyze finds the slowest requests, in order', () => {
  const { entries } = parseLog(SAMPLE);
  const slowest = analyze(entries).slowest;
  assert.deepEqual(slowest.map((e) => e.durationMs), [2310, 1240, 340]);
});

test('error rate', () => {
  const { entries } = parseLog(SAMPLE);
  assert.equal(analyze(entries).errorRate, 0.4);
  assert.equal(analyze([]).errorRate, 0); // no division-by-zero NaN
});
