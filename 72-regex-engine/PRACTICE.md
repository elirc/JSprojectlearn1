# 🏋️ Practice: Regex Engine

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Exercises 2, 4, and 5 add code to the engine — work on a **copy** of `refactored/regex.js`. Exercises 3 and 6 need no engine changes at all.

## Exercises

### ⭐ 1. Pattern X-ray (warm-up)

Call `parsePattern('^b[aeiou]g*$')` and, *before running*, write down: the two anchor flags, how many nodes, and each node's atom kind + quantifier. Then print a compact shape string like `char class char*` and check the class's `chars` set.

What it practices: stage separation — the pattern is fully digested into data before any matching happens.
Hint: `nodes.map(n => n.atom.kind + (n.quant ?? ''))`.

Expected: `anchoredStart` and `anchoredEnd` both `true`, 3 nodes, shape `char class char*`, and the class holds exactly `a e i o u` with no ranges.

### ⭐⭐ 2. `matchIndex` — *where* did it match? (core)

`test` answers yes/no; write `matchIndex(pattern, text)` that returns the starting index of the first match, or `-1`. Add it to your copy of `regex.js` next to `test` — it's the same starting-positions idea, but you need to know *which* start succeeded, so `.some(...)` won't do.

What it practices: the unanchored-search loop — every "find" feature is "try each start, report the first winner".
Hint: replace `.some` with a `for...of` over `starts`; return `start` on success, `-1` after the loop.

Expected: `matchIndex('b.g', 'a big dog')` → `2`, `matchIndex('d[aeiou]g', 'a big dog')` → `6`, `matchIndex('^x', 'abc')` → `-1`, `matchIndex('', 'abc')` → `0`, `matchIndex('c$', 'abc')` → `2`.

### ⭐⭐ 3. Test the empty-and-optional corners (core)

No engine changes. The suite never tests these boundary patterns — write tests (scratch file, `node:test`) for: the empty pattern `''` against anything; `'^$'` against `''` and against `'x'`; `'colou?r'` against `'color'`, `'colour'`, and `'colouur'`; and the negated class `'^[^a]+$'` against `'bcd'` and `'bad'`. Run every case through JavaScript's own `new RegExp(pattern).test(text)` too and assert both engines agree.

What it practices: edge-case thinking plus the referee trick — your engine isn't just self-consistent, it matches the spec.
Hint: a table of `[pattern, text, expected]` triples and one loop with two asserts per row.

Expected: `true, true, false, true, true, false, true, false` — in the order listed, from both engines.

### ⭐⭐ 4. The `{n}` quantifier (core)

Support exact repetition: `a{3}` matches exactly three `a`s, `[0-9]{4}` a four-digit code. Here's the insight that makes it cheap: you don't need matcher changes at all. At *parse* time, expand `X{n}` into n copies of the node — the matcher never knows `{n}` existed. Malformed counts (`a{x}`, `a{}`, `a{2` with no brace) must throw `SyntaxError` at parse time.

What it practices: desugaring — implementing a feature by rewriting it into features you already have, in the parse stage where syntax belongs.
Hint: in `parsePattern`, where `*+?` is checked, add an `else if` for `{`: find the `}`, `Number(...)` the slice, validate with `Number.isInteger(n) && n >= 1`, then push `n - 1` extra `{atom, quant: null}` copies before the usual push.

Expected: `test('^a{3}$','aaa')` → `true`, `'aa'` and `'aaaa'` → `false`; `test('^[0-9]{4}$','2026')` → `true`; `test('x{2}','axxa')` → `true`; `parsePattern('a{x}')` throws.

### ⭐⭐⭐ 5. `firstMatch` — return the matched text (challenge)

Write `firstMatch(pattern, text)` returning the matched *substring* (or `null`). The matcher only says true/false, so you need a variant of `matchHere` — call it `matchEnd` — that returns *where the match ended* (an index) or `-1`. Same structure, same backtracking; only the return value grows up. Then study one surprise: what does `firstMatch('a*', 'aaa')` return, and why?

What it practices: threading one extra piece of information through every branch of a recursive search without disturbing the search itself.
Hint: base case: `return anchoredEnd ? (t === text.length ? t : -1) : t;`. Every `return true` becomes "return the recursive result if it isn't -1".

Expected: `firstMatch('a+b', 'xxaaab!')` → `'aaab'`, `firstMatch('b.g', 'a big dog')` → `'big'`, `firstMatch('z+', 'abc')` → `null` — and `firstMatch('a*', 'aaa')` → `''` (empty string!) because this engine tries the minimum first, while `firstMatch('^a*$', 'aaa')` → `'aaa'` because the `$` forces the star onward.

### ⭐⭐⭐ 6. Alternation — `cat|dog` — with zero engine changes (challenge)

Support `|` as a *wrapper*: write `altTest(pattern, text)` in a new file that splits the pattern on top-level `|` and returns whether any alternative matches via the existing `test`. The splitting is the real exercise: `\|` is a literal pipe (no split), and `|` inside a class like `[a|b]` is literal too. This works because `|` has the lowest precedence of any regex operator — each side is a complete pattern.

What it practices: growing a feature *around* a closed engine, plus a hand-rolled mini-tokenizer for the split.
Hint: walk the pattern once with an `inClass` flag; on `\`, copy two characters and skip; collect segments into an array; finish with `.some()`.

Expected: `altTest('cat|dog', 'hotdog')` → `true`, `altTest('cat|dog', 'cow')` → `false`, `altTest('^a$|^b$', 'b')` → `true`, `altTest('a\\|b', 'a|b')` → `true` but `→ false` for `'ab'`, `altTest('[a|b]x', '|x')` → `true`.

## Solutions

### 1. Pattern X-ray

```js
import { parsePattern } from './refactored/regex.js';
const p = parsePattern('^b[aeiou]g*$');
console.log(p.anchoredStart, p.anchoredEnd);              // true true
console.log(p.nodes.map((n) => n.atom.kind + (n.quant ?? '')).join(' ')); // char class char*
console.log([...p.nodes[1].atom.chars].sort());           // ['a','e','i','o','u']
```

WHY: the anchors are *flags*, not nodes — they were peeled off during parsing, which is why the matcher can check them in two tiny places. Seeing `[aeiou]` become one `class` atom with a resolved `Set` shows why the matcher never re-reads pattern syntax: all the syntax is already gone.

### 2. `matchIndex`

```js
export function matchIndex(pattern, text) {
  const { anchoredStart, anchoredEnd, nodes } = parsePattern(pattern);
  const starts = anchoredStart ? [0] : Array.from({ length: text.length + 1 }, (_, k) => k);
  for (const start of starts) {
    if (matchHere(nodes, 0, text, start, anchoredEnd)) return start;
  }
  return -1;
}
```

WHY: `test` is `matchIndex(...) !== -1` in disguise — the unanchored loop already visits starts in left-to-right order, so the first success *is* the leftmost match, which is what every real regex engine reports. The `''`→`0` and `'c$'`→`2` cases confirm the two boundary behaviors: an empty pattern matches immediately, and the `text.length + 1` starts list lets matches begin at the very end. (All five expected values verified with node.)

### 3. Empty-and-optional corner tests

```js
import { test as t } from 'node:test';
import assert from 'node:assert/strict';
import { test as reTest } from './refactored/regex.js';

t('boundary patterns agree with the real RegExp', () => {
  const cases = [
    ['', 'anything', true],       ['^$', '', true],       ['^$', 'x', false],
    ['colou?r', 'color', true],   ['colou?r', 'colour', true], ['colou?r', 'colouur', false],
    ['^[^a]+$', 'bcd', true],     ['^[^a]+$', 'bad', false],
  ];
  for (const [pattern, text, expected] of cases) {
    assert.equal(reTest(pattern, text), expected, `${pattern} vs ${text}`);
    assert.equal(new RegExp(pattern).test(text), expected, `referee: ${pattern}`);
  }
});
```

WHY: `''` and `'^$'` exercise the base case of `matchHere` with zero nodes — the code path everything else stands on — and `colouur` proves `?` can't be stretched into "two or more". Running the same table through `RegExp` is the round-trip trick from project 69: the platform is the referee, so a bug in your *expectations* gets caught, not just bugs in the engine. (Verified: both engines agree on all eight.)

### 4. The `{n}` quantifier

```js
    let quant = null;
    if ('*+?'.includes(source[i])) { quant = source[i]; i++; }
    else if (source[i] === '{') {
      const close = source.indexOf('}', i + 1);
      const n = close === -1 ? NaN : Number(source.slice(i + 1, close));
      if (!Number.isInteger(n) || n < 1) throw new SyntaxError(`Bad {n} quantifier at position ${i}`);
      for (let c = 0; c < n - 1; c++) nodes.push({ atom, quant: null });
      i = close + 1;
    }
    nodes.push({ atom, quant });
```

WHY: `a{3}` and `aaa` are the same pattern, so make the parser say so — the matcher gains the feature without learning anything, which means it cannot have new bugs. This is desugaring, the same move compilers make constantly. Sharing one atom object between copies is safe because the matcher only reads atoms; and `Number('')` → 0, `Number('x')` → NaN, and a missing `}` → NaN all fall into the single `Number.isInteger(n) && n >= 1` guard. (All expected results and all three throws verified with node.)

### 5. `firstMatch`

```js
export function firstMatch(pattern, text) {
  const { anchoredStart, anchoredEnd, nodes } = parsePattern(pattern);
  const starts = anchoredStart ? [0] : Array.from({ length: text.length + 1 }, (_, k) => k);
  for (const start of starts) {
    const end = matchEnd(nodes, 0, text, start, anchoredEnd);
    if (end !== -1) return text.slice(start, end);
  }
  return null;
}

function matchEnd(nodes, n, text, t, anchoredEnd) {
  if (n === nodes.length) return anchoredEnd ? (t === text.length ? t : -1) : t;
  const { atom, quant } = nodes[n];
  if (quant === '*' || quant === '+') {
    let k = t;
    if (quant === '+') {
      if (!atomMatches(atom, text[k])) return -1;
      k++;
    }
    while (true) {
      const end = matchEnd(nodes, n + 1, text, k, anchoredEnd);
      if (end !== -1) return end;
      if (!atomMatches(atom, text[k])) return -1;
      k++;
    }
  }
  if (quant === '?') {
    if (atomMatches(atom, text[t])) {
      const end = matchEnd(nodes, n + 1, text, t + 1, anchoredEnd);
      if (end !== -1) return end;
    }
    return matchEnd(nodes, n + 1, text, t, anchoredEnd);
  }
  if (!atomMatches(atom, text[t])) return -1;
  return matchEnd(nodes, n + 1, text, t + 1, anchoredEnd);
}
```

WHY: the search is untouched — same choice points, same backtracking — but every `true` now carries *where the match stopped*, and `-1` plays the role of `false`. The surprise is the payoff: `firstMatch('a*', 'aaa')` → `''` because this engine explores minimum-first ("lazy"), so the zero-width split succeeds instantly; real engines are greedy and would say `'aaa'`. Yes/no answers can't tell lazy from greedy apart — extracted text can, which is why this difference only became visible now. (Verified with node, including `'^a*$'` → `'aaa'` where the anchor forces greed.)

### 6. Alternation wrapper

```js
import { test as reTest } from './refactored/regex.js';

export function altTest(pattern, text) {
  const alternatives = [];
  let current = '';
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\') { current += ch + (pattern[i + 1] ?? ''); i++; continue; }
    if (ch === '[') inClass = true;
    if (ch === ']') inClass = false;
    if (ch === '|' && !inClass) { alternatives.push(current); current = ''; continue; }
    current += ch;
  }
  alternatives.push(current);
  return alternatives.some((alt) => reTest(alt, text));
}
```

WHY: because `|` binds loosest of all, `cat|dog` really is two independent patterns joined by OR — so "try each alternative" is not an approximation, it's the semantics (each side even keeps its own anchors, like `^a$|^b$`). The splitter is a two-rule tokenizer: `\` protects the next character, and brackets suspend splitting — the same escape-awareness the engine's own parser needed. The limit worth knowing: without groups, `gr(a|e)y` is out of reach — grouped alternation needs the parser itself, which is exactly why real engines parse `|` into a tree. (All eight expected values verified with node.)
