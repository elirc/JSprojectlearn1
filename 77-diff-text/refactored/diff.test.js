import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffLines, summarize, toLines } from './diff.js';
import { formatDiff, formatSummary, formatCompact } from './format.js';

/** Shorthand: 'a\nb' -> the lines, so the tests read like files. */
const text = (...lines) => lines.join('\n');

/** Rebuild a side of the diff from the operations. */
const rebuild = (operations, keep) =>
  operations.filter((operation) => keep.includes(operation.type)).map((operation) => operation.line);

test('identical files produce only same-lines', () => {
  const operations = diffLines(text('a', 'b', 'c'), text('a', 'b', 'c'));
  assert.deepEqual(operations, [
    { type: 'same', line: 'a' },
    { type: 'same', line: 'b' },
    { type: 'same', line: 'c' },
  ]);
  assert.equal(summarize(operations).identical, true);
  assert.equal(summarize(operations).changed, 0);
});

test('THE BUG: inserting one line at the top changes exactly one line', () => {
  const operations = diffLines(text('a', 'b', 'c'), text('new', 'a', 'b', 'c'));
  assert.deepEqual(operations, [
    { type: 'add', line: 'new' },
    { type: 'same', line: 'a' },
    { type: 'same', line: 'b' },
    { type: 'same', line: 'c' },
  ]);
  const totals = summarize(operations);
  assert.equal(totals.add, 1);
  assert.equal(totals.del, 0); // the original reported 3 deletions and 4 additions
  assert.equal(totals.same, 3);
});

test('deleting a line in the middle marks only that line', () => {
  const operations = diffLines(text('a', 'b', 'c'), text('a', 'c'));
  assert.deepEqual(operations, [
    { type: 'same', line: 'a' },
    { type: 'del', line: 'b' },
    { type: 'same', line: 'c' },
  ]);
  assert.equal(summarize(operations).del, 1);
});

test('a changed line is a deletion followed by an addition', () => {
  const operations = diffLines(text('a', 'b', 'c'), text('a', 'B', 'c'));
  assert.deepEqual(operations, [
    { type: 'same', line: 'a' },
    { type: 'del', line: 'b' },
    { type: 'add', line: 'B' },
    { type: 'same', line: 'c' },
  ]);
});

test('a surviving line is recognised even when its position moved', () => {
  const operations = diffLines(text('apple', 'banana', 'cherry'), text('apple', 'blueberry', 'banana'));
  assert.deepEqual(rebuild(operations, ['same']), ['apple', 'banana']); // the LCS
  assert.equal(summarize(operations).changed, 2); // not 4
});

test('empty files, in every combination', () => {
  assert.deepEqual(diffLines('', ''), []);
  assert.deepEqual(diffLines('', text('a', 'b')), [
    { type: 'add', line: 'a' },
    { type: 'add', line: 'b' },
  ]);
  assert.deepEqual(diffLines(text('a', 'b'), ''), [
    { type: 'del', line: 'a' },
    { type: 'del', line: 'b' },
  ]);
  assert.equal(summarize(diffLines('', '')).identical, true);
});

test('toLines: empty text is zero lines, and CRLF is normalised', () => {
  assert.deepEqual(toLines(''), []);
  assert.deepEqual(toLines('a'), ['a']);
  assert.deepEqual(toLines('a\r\nb'), ['a', 'b']);
  assert.deepEqual(toLines('a\n\nb'), ['a', '', 'b']); // a real blank line is a line
  assert.throws(() => toLines(null), TypeError);
});

test('a file that is only a blank line differs from an empty file', () => {
  assert.deepEqual(diffLines('', '\n'), [
    { type: 'add', line: '' },
    { type: 'add', line: '' },
  ]);
  assert.equal(summarize(diffLines('', '')).changed, 0);
});

test('ROUND TRIP: same+del rebuilds the old text, same+add rebuilds the new', () => {
  const oldText = text('one', 'two', 'three', 'four', 'five');
  const newText = text('one', 'TWO', 'three', 'five', 'six');
  const operations = diffLines(oldText, newText);
  assert.deepEqual(rebuild(operations, ['same', 'del']), toLines(oldText));
  assert.deepEqual(rebuild(operations, ['same', 'add']), toLines(newText));
});

test('ROUND TRIP holds for 200 random file pairs', () => {
  for (let trial = 0; trial < 200; trial++) {
    const makeFile = () =>
      Array.from({ length: Math.floor(Math.random() * 10) }, () =>
        'abcde'[Math.floor(Math.random() * 5)],
      ).join('\n');
    const oldText = makeFile();
    const newText = makeFile();
    const operations = diffLines(oldText, newText);
    assert.deepEqual(rebuild(operations, ['same', 'del']), toLines(oldText), `old: ${JSON.stringify(oldText)}`);
    assert.deepEqual(rebuild(operations, ['same', 'add']), toLines(newText), `new: ${JSON.stringify(newText)}`);
  }
});

test('the diff is MINIMAL: same-count equals the true LCS length', () => {
  // Brute-force LCS length, to check the table is doing its job.
  const lcsLength = (a, b) => {
    if (a.length === 0 || b.length === 0) return 0;
    if (a[0] === b[0]) return 1 + lcsLength(a.slice(1), b.slice(1));
    return Math.max(lcsLength(a.slice(1), b), lcsLength(a, b.slice(1)));
  };
  for (let trial = 0; trial < 60; trial++) {
    const makeFile = () =>
      Array.from({ length: Math.floor(Math.random() * 7) }, () => 'abc'[Math.floor(Math.random() * 3)]);
    const oldLines = makeFile();
    const newLines = makeFile();
    const operations = diffLines(oldLines.join('\n'), newLines.join('\n'));
    assert.equal(
      summarize(operations).same,
      lcsLength(oldLines, newLines),
      `not minimal for ${JSON.stringify(oldLines)} vs ${JSON.stringify(newLines)}`,
    );
  }
});

test('formatDiff prefixes every line consistently', () => {
  const operations = diffLines(text('a', 'b'), text('a', 'B'));
  assert.equal(formatDiff(operations), ['  a', '- b', '+ B'].join('\n'));
  assert.equal(formatDiff([]), '');
});

test('formatSummary reads like git, including the singular/plural', () => {
  assert.equal(formatSummary(diffLines(text('a'), text('a'))), 'no changes');
  assert.equal(formatSummary(diffLines(text('a'), text('a', 'b'))), '1 insertion(+)');
  assert.equal(formatSummary(diffLines(text('a', 'b'), text('a'))), '1 deletion(-)');
  assert.equal(formatSummary(diffLines(text('a', 'b'), text('a', 'B'))), '1 insertion(+), 1 deletion(-)');
  assert.equal(formatSummary(diffLines('', text('a', 'b'))), '2 insertions(+)');
});

test('formatCompact hides untouched stretches behind ...', () => {
  const before = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`);
  const after = [...before];
  after[4] = 'line 5 (edited)';
  const operations = diffLines(before.join('\n'), after.join('\n'));

  assert.equal(
    formatCompact(operations, { context: 1 }),
    ['...', '  line 4', '- line 5', '+ line 5 (edited)', '  line 6', '...'].join('\n'),
  );
  assert.equal(formatCompact(diffLines(text('a', 'b'), text('a', 'b'))), '...'); // nothing changed
  assert.throws(() => formatCompact(operations, { context: -1 }), RangeError);
});
