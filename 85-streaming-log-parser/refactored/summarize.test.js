import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { addLine, createAccumulator, finish, summarizeLines, summarizeStream } from './summarize.js';

// No big files here — a stream is just "chunks arriving over time", and
// Readable.from lets us hand-deliver the exact chunks we want to test.

const LINES = [
  '2024-03-01T09:00:00Z [INFO] /api/users 200 42ms',
  '2024-03-01T09:00:01Z [ERROR] /api/orders 500 1200ms',
  '2024-03-01T09:00:02Z [WARN] /health 404 7ms',
  '-- corrupted --',
  '',
  '2024-03-01T09:00:03Z [INFO] /api/search 200 300ms',
];
const TEXT = `${LINES.join('\n')}\n`;

const stream = (...chunks) => Readable.from(chunks);

test('the summary is counts, not lines', () => {
  const summary = summarizeLines(LINES);
  assert.equal(summary.lines, 6);
  assert.equal(summary.parsed, 4);
  assert.equal(summary.malformed, 1);
  assert.equal(summary.blank, 1, 'a blank line is blank, not malformed');
  assert.deepEqual(summary.byLevel, { INFO: 2, ERROR: 1, WARN: 1 });
  assert.deepEqual(summary.byStatusClass, { '2xx': 2, '5xx': 1, '4xx': 1 });
  assert.equal(summary.errorRate, 1 / 4);
  assert.equal(summary.malformedRate, 1 / 6);
  assert.equal(summary.meanDurationMs, (42 + 1200 + 7 + 300) / 4);
  assert.equal(summary.maxDurationMs, 1200);
  assert.deepEqual(summary.histogram, {
    '<10ms': 1, '<100ms': 1, '<1000ms': 1, '>=1000ms': 1,
  });
});

test('two front doors, one brain: the stream agrees with the array', async () => {
  assert.deepEqual(await summarizeStream(stream(TEXT)), summarizeLines(LINES));
});

test('THE streaming lesson: a chunk boundary may fall mid-line', async () => {
  // Split the text at an awkward spot, inside a timestamp.
  const cut = TEXT.indexOf('9:00:01') + 3;
  const split = await summarizeStream(stream(TEXT.slice(0, cut), TEXT.slice(cut)));
  assert.deepEqual(split, summarizeLines(LINES), 'the halved line was reassembled');

  // Even one character at a time — which is what `Readable.from(string)`
  // does, and what a slow network delivers.
  assert.deepEqual(await summarizeStream(Readable.from(TEXT)), summarizeLines(LINES));
});

test('Windows line endings and a missing final newline both work', async () => {
  const crlf = await summarizeStream(stream(LINES.join('\r\n')));
  assert.deepEqual(crlf, summarizeLines(LINES), 'CRLF: no stray \\r breaking the parse');

  const noTrailingNewline = await summarizeStream(stream(LINES.join('\n')));
  assert.equal(noTrailingNewline.lines, 6, 'the last line counts even without a newline');
});

test('an empty log is a report of zeros, never a NaN', async () => {
  for (const summary of [summarizeLines([]), await summarizeStream(stream(''))]) {
    assert.equal(summary.lines, 0);
    assert.equal(summary.parsed, 0);
    assert.equal(summary.errorRate, 0);
    assert.equal(summary.malformedRate, 0);
    assert.equal(summary.meanDurationMs, 0);
    assert.equal(summary.maxDurationMs, 0);
    assert.deepEqual(summary.slowest, []);
    assert.deepEqual(summary.byLevel, {});
  }
});

test('a log of pure junk is counted, not thrown', async () => {
  const summary = await summarizeStream(stream('nope\nstill nope\n{"json":true}\n'));
  assert.equal(summary.lines, 3);
  assert.equal(summary.malformed, 3);
  assert.equal(summary.malformedRate, 1);
  assert.equal(summary.errorRate, 0, 'no parsed lines means no error rate, not 0/0');
});

test('the top-K list is bounded — 1000 lines, 3 kept', () => {
  const many = Array.from({ length: 1000 }, (_, i) =>
    `2024-03-01T09:00:00Z [INFO] /p${i} 200 ${i}ms`);
  const summary = summarizeLines(many);
  assert.equal(summary.parsed, 1000);
  assert.equal(summary.slowest.length, 3);
  assert.deepEqual(summary.slowest.map((row) => row.durationMs), [999, 998, 997]);
  assert.deepEqual(summary.slowest.map((row) => row.path), ['/p999', '/p998', '/p997']);
  assert.equal(summarizeLines(many, { topCount: 5 }).slowest.length, 5);
  assert.equal(summarizeLines(many.slice(0, 2), { topCount: 5 }).slowest.length, 2);
});

test('memory does not grow with the log: the accumulator stays the same size', () => {
  const acc = createAccumulator({ topCount: 3 });
  const size = (value) => JSON.stringify(value).length;
  for (let i = 0; i < 200; i++) {
    addLine(acc, `2024-03-01T09:00:00Z [INFO] /api/users 200 ${i}ms`);
  }
  const after200 = size(acc);
  for (let i = 0; i < 20_000; i++) {
    addLine(acc, `2024-03-01T09:00:00Z [INFO] /api/users 200 ${i % 1500}ms`);
  }
  assert.equal(acc.top.length, 3, 'still only three rows retained');
  assert.ok(size(acc) < after200 + 60, `accumulator grew from ${after200} to ${size(acc)} chars`);
  assert.equal(finish(acc).parsed, 20_200);
});

test('bucket edges are configurable, and the labels follow', () => {
  const summary = summarizeLines(LINES, { bucketEdges: [50, 500] });
  assert.deepEqual(summary.histogram, { '<50ms': 2, '<500ms': 1, '>=500ms': 1 });
});

test('bytes are counted in bytes, not characters', () => {
  const summary = summarizeLines(['héllo']); // 5 characters, 6 bytes, + newline
  assert.equal(summary.bytes, 7);
  assert.equal(summary.malformed, 1);
});

test('silly options are rejected', () => {
  assert.throws(() => createAccumulator({ topCount: 0 }), RangeError);
  assert.throws(() => createAccumulator({ topCount: 2.5 }), RangeError);
});

test('the same input always gives the same report', async () => {
  const once = await summarizeStream(stream(TEXT));
  const twice = await summarizeStream(stream(TEXT));
  assert.deepEqual(once, twice);
});

test('progress is reported DURING the read, not after it', async () => {
  const many = Array.from({ length: 25 }, () =>
    '2024-03-01T09:00:00Z [INFO] /api/users 200 5ms').join('\n');
  const seen = [];
  const summary = await summarizeStream(stream(many), {
    progressEvery: 10,
    onProgress: (p) => seen.push(p.lines),
  });
  assert.deepEqual(seen, [10, 20]);
  assert.equal(summary.lines, 25);
});
