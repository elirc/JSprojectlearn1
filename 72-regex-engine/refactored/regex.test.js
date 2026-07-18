import { test as t } from 'node:test';
import assert from 'node:assert/strict';
import { test as reTest, parsePattern } from './regex.js';

t("THE GREED BUG, FIXED: star gives characters back when the rest needs them", () => {
  assert.equal(reTest('a*a', 'aaa'), true);   // the original said false
  assert.equal(reTest('.*x', 'abcx'), true);  // .* must hand the x back
  assert.equal(reTest('a*ab', 'aaab'), true); // two give-backs
  assert.equal(reTest('a*b', 'aab'), true);   // greed-is-fine cases still fine
});

t('unanchored by default: patterns are FOUND inside text', () => {
  assert.equal(reTest('b.g', 'a big dog'), true); // the original: false
  assert.equal(reTest('dog', 'a big dog'), true);
  assert.equal(reTest('cat', 'a big dog'), false);
});

t('anchors control position', () => {
  assert.equal(reTest('^big', 'big dog'), true);
  assert.equal(reTest('^dog', 'big dog'), false);
  assert.equal(reTest('dog$', 'big dog'), true);
  assert.equal(reTest('big$', 'big dog'), false);
  assert.equal(reTest('^big dog$', 'big dog'), true);
  assert.equal(reTest('^b.*g$', 'big dog'), true); // backtracking + both anchors
});

t('quantifiers: + needs one, ? allows zero or one', () => {
  assert.equal(reTest('ab+c', 'abbbc'), true);
  assert.equal(reTest('ab+c', 'ac'), false);
  assert.equal(reTest('ab?c', 'abc'), true);
  assert.equal(reTest('ab?c', 'ac'), true);
  assert.equal(reTest('ab?c', 'abbc'), false);
  assert.equal(reTest('a+a', 'aa'), true); // backtracking applies to + too
});

t('character classes: sets, ranges, negation', () => {
  assert.equal(reTest('b[aeiou]g', 'big'), true);
  assert.equal(reTest('b[aeiou]g', 'bxg'), false);
  assert.equal(reTest('[a-z]+', 'hello'), true);
  assert.equal(reTest('^[a-z0-9]+$', 'user42'), true);
  assert.equal(reTest('^[a-z0-9]+$', 'User42'), false);
  assert.equal(reTest('b[^aeiou]g', 'bxg'), true);
  assert.equal(reTest('b[^aeiou]g', 'big'), false);
  assert.equal(reTest('[a-c]*d', 'abcabcd'), true); // classes under a star, backtracked
});

t('escapes make magic characters literal', () => {
  assert.equal(reTest('3\\.14', '3.14'), true);
  assert.equal(reTest('3\\.14', '3914'), false); // a real dot would match the 9
  assert.equal(reTest('a\\*b', 'a*b'), true);
  assert.equal(reTest('a\\*b', 'aaab'), false);
});

t('a realistic composite: crude email shape', () => {
  const email = '^[a-z0-9]+@[a-z]+\\.[a-z]+$';
  assert.equal(reTest(email, 'ada@lovelace.dev'), true);
  assert.equal(reTest(email, 'not an email'), false);
  assert.equal(reTest(email, 'ada@lovelace'), false);
});

t('empty-ish edges', () => {
  assert.equal(reTest('a*', ''), true);   // zero a's, found at position 0
  assert.equal(reTest('', 'anything'), true);
  assert.equal(reTest('^$', ''), true);
  assert.equal(reTest('^$', 'x'), false);
});

t('agreement spot-check against the real engine', () => {
  const cases = [
    ['a*a', 'aaa'], ['.*x', 'abcx'], ['b.g', 'a big dog'], ['^dog', 'big dog'],
    ['ab?c', 'abbc'], ['[a-c]*d', 'abcabcd'], ['a+a', 'a'], ['x?y?z?', ''],
  ];
  for (const [pattern, text] of cases) {
    assert.equal(reTest(pattern, text), new RegExp(pattern).test(text),
      `disagree with RegExp on /${pattern}/ vs "${text}"`);
  }
});

t('malformed patterns are loud SyntaxErrors', () => {
  assert.throws(() => parsePattern('*a'), /nothing to repeat/);
  assert.throws(() => parsePattern('[abc'), /Unclosed/);
  assert.throws(() => parsePattern('a\\'), /Trailing backslash/);
  assert.throws(() => parsePattern('[]'), /Empty character class/);
});
