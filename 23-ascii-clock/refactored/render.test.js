import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, renderText } from './render.js';
import { FONT, FONT_HEIGHT } from './font.js';

test('formatTime pads every part to two digits', () => {
  // A FIXED date — the clock logic is testable because "now" isn't baked in.
  const date = new Date(2026, 0, 1, 9, 5, 3);
  assert.equal(formatTime(date), '09:05:03');
});

test('renderText draws a known string exactly', () => {
  assert.equal(
    renderText('10'),
    [
      '  # ###',
      '  # # #',
      '  # # #',
      '  # # #',
      '  # ###',
    ].join('\n'),
  );
});

test('every glyph is exactly 5 rows of 3 characters', () => {
  // A test on the DATA. If someone edits the font and makes a row
  // 4 characters wide, this fails with the culprit named.
  for (const [char, glyph] of Object.entries(FONT)) {
    assert.equal(glyph.length, FONT_HEIGHT, `"${char}" has ${glyph.length} rows`);
    for (const row of glyph) {
      assert.equal(row.length, 3, `"${char}" row "${row}" is not 3 wide`);
    }
  }
});

test('rendering a full time string gives 5 rows of equal width', () => {
  const art = renderText('23:59:00');
  const rows = art.split('\n');
  assert.equal(rows.length, FONT_HEIGHT);
  assert.ok(rows.every((row) => row.length === rows[0].length));
});

test('unsupported characters fail loudly', () => {
  assert.throws(() => renderText('12:x0'), /No glyph for "x"/);
});
