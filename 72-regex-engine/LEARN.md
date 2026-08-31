# 📘 Learning Guide: Regex Engine

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

We are building a small **regex engine**: a function `test(pattern, text)` that answers one question — does this pattern appear in this text?

```js
test('b.g', 'a big dog')   // true  ("big" fits the pattern)
test('a*a', 'aaa')         // true
test('cat', 'a big dog')   // false
test('^[a-z0-9]+$', 'user42') // true
```

You've probably *used* regexes (JavaScript's built-in `/pattern/`). This project builds one from scratch, so the "magic" becomes 130 lines of understandable code. The original version in `original.js` contains the exact bug that makes regex engines *seem* magical — it can't undo a greedy choice — and the refactor fixes it.

## 2. Concepts you need first

**Regular expression (regex).** A mini-language for describing text patterns. Instead of "a b, then any character, then a g," you write `b.g`. Our engine supports:

- **Literals**: `dog` matches the exact letters d, o, g in a row.
- `.` (**dot**): matches any single character. `b.g` matches "big", "bag", "bog".
- `*` (**star**): the thing before it, repeated **zero or more** times. `ab*c` matches "ac", "abc", "abbbc".
- `+` (**plus**): repeated **one or more** times. `ab+c` matches "abc" but not "ac".
- `?`: **zero or one**. `ab?c` matches "ac" and "abc" — never "abbc".
- `[abc]` (**character class**): any ONE of a, b, or c. `b[aeiou]g` matches "big" and "bag" but not "bxg".
- `[a-z]` (**range**): any one character from a through z. `[a-z0-9]` = any lowercase letter or digit.
- `[^abc]` (**negated class**): any one character that is NOT a, b, or c.
- `^` and `$` (**anchors**): `^` means "must start at the beginning of the text", `$` means "must end at the end". `^dog$` matches exactly "dog", nothing more.
- `\` (**escape**): makes a special character literal. `3\.14` matches "3.14" but not "3914" (a bare `.` would match the 9 too!).

`*`, `+`, and `?` are together called **quantifiers** — they say how many times something repeats.

**Greedy matching.** A quantifier is "greedy" when it grabs as many characters as it can. Greed alone is fine — *greed you can never take back* is the bug. In `a*a` vs `"aaa"`: if the star eats all three a's, nothing is left for the final `a` in the pattern. The right answer: star takes two, final `a` takes the third. To find that, the engine must be able to **give characters back**.

**Backtracking.** The algorithm of "try a choice; if the rest fails, undo and try the next choice." Like solving a maze: walk until you hit a wall, back up to the last fork, take the other path. In code, **recursion** does the backing-up for us.

**Recursion.** A function calling itself, each call handling a smaller piece. Here's the key insight used everywhere in this project: when a recursive call returns `false`, everything it tried is automatically forgotten — the **call stack** (the list of function calls currently in progress) unwinds, and you're back at your fork in the maze with nothing to clean up. The call stack IS the undo log.

```js
function countdown(n) {
  if (n === 0) return;
  console.log(n);
  countdown(n - 1);   // calls itself with a smaller problem
}
countdown(3); // prints 3, 2, 1
```

**Parsing (two-stage design).** Rather than reading pattern syntax *while* matching, we first **parse** the pattern once into an array of plain objects called **nodes**: `"b[aeiou]g*"` becomes three `{atom, quant}` nodes. An **atom** is one matchable unit (a character, a dot, or a class); `quant` is its quantifier or `null`. The matcher then works on clean data and never re-reads syntax. Bad patterns (like `[abc` with no `]`) fail loudly at parse time with a `SyntaxError` — JavaScript's built-in error type for malformed input.

**Anchored vs unanchored.** An anchored match must start at position 0 of the text. An unanchored search tries every starting position: 0, 1, 2, ... until one works. Real regex engines are unanchored by default — that's why `/dog/` is *found inside* "a big dog". You opt into anchoring with `^`.

**Set and charCodeAt (small JS bits used here).** A `Set` is a collection with fast "does it contain X?" lookup: `new Set(['a','b']).has('a')` → `true`. And `'a'.charCodeAt(0)` gives a character's numeric code (97 for 'a'), which is how a range check like `[a-z]` becomes simple number comparison: `code >= 97 && code <= 122`.

## 3. Walking through the original code

The whole original engine is two functions.

```js
function match(pattern, text) {
  return matchHere(pattern, 0, text, 0);
}
```

`matchHere(pattern, p, text, t)` asks: does the pattern *starting at index p* match the text *starting at index t*? Starting both at 0 means: anchored to the very beginning, always.

```js
if (p >= pattern.length) return true; // pattern exhausted: match!
```

Base case: if we've walked off the end of the pattern, every part of it found a home. Success.

```js
var isStar = pattern[p + 1] === "*";
if (isStar) {
  while (t < text.length && (text[t] === pattern[p] || pattern[p] === ".")) {
    t++;
  }
  return matchHere(pattern, p + 2, text, t);
}
```

If the *next* pattern character is `*`: eat every matching character in a loop, then move past the star (`p + 2`) and continue from wherever the eating stopped. One decision, made once, never revisited. **This is the fatal greed.**

```js
if (t < text.length && (text[t] === pattern[p] || pattern[p] === ".")) {
  return matchHere(pattern, p + 1, text, t + 1);
}
return false;
```

The plain-character case: if the current text character matches the current pattern character (or the pattern has `.`), advance both by one and recurse. Otherwise the match fails.

The demo lines at the bottom show the damage: `match("a*a", "aaa")` prints `false` (wrong!), and `match("b.g", "a big dog")` prints `false` because the engine never tries starting anywhere but position 0.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: greed with no undo.** Run `a*a` against `"aaa"` in your head using the original's rules. The star's `while` loop eats a, a, a — all three. Now the pattern still has one `a` left to match, but the text is used up. `false`. But you can *see* the correct split: star takes "aa", final `a` takes the last one. The engine can't see it, because after the `while` loop ends there is no code path that says "hmm, that didn't work — give one back."

Here's how it bites you later: you ship this in a log scanner using the pattern `.*ERROR`. It never finds anything — `.*` swallows the entire line, including the word ERROR itself, and then `ERROR` in the pattern has nothing left to match. You stare at the pattern for an hour. The pattern is fine; the engine is broken. This exact confusion is why regex engines feel like magic — the fix (backtracking) is what makes them feel like engineering.

**Flaw 2: anchored-only, and no way to choose.** The match always begins at `text[0]`. So `b.g` matches `"big"` but is invisible inside `"a big dog"` — the engine never tries starting at index 2. Real-world searching is almost always "find this ANYWHERE in the text." And since there's no `^` or `$`, you can't even express "the whole text must be exactly this" versus "this appears somewhere."

**Flaw 3 (unstated but real): no vocabulary.** No `+`, no `?`, no `[abc]`, no escapes. You can't write "one or more digits" or "a literal dot." Every real pattern you'd want — an email shape, a filename check — is unwritable.

## 5. Try it yourself first!

Try to fix `matchHere` yourself before reading on. Hints, vaguest first:

1. The star's problem is that it makes ONE choice. What if it tried EVERY choice — eat 0 characters, eat 1, eat 2 ... — and asked, for each, "does the rest of the pattern match from here?"
2. "Does the rest match from here?" is a question you already have a function for. Call `matchHere` recursively with the pattern past the star, at each candidate text position. First recursive call that returns true → return true.
3. Order matters less than completeness, but try the *minimum* first (eat 0, then 1, then 2...). Stop trying when the current character no longer matches the starred atom — no more choices exist.
4. For unanchored search: wrap the whole thing in a loop that tries `matchHere(...)` from text position 0, then 1, then 2, up to and including `text.length` (yes, one past the last character — an empty pattern or a pure-star pattern can match empty text at the end).
5. For a cleaner engine, split the work: first parse the pattern string into `{atom, quant}` objects (resolving `[a-z]` classes and `\` escapes once), then write the matcher against those objects.

## 6. Understanding the refactored solution

**Stage 1: `parsePattern(source)`.** A loop that walks the pattern string and builds nodes. It peels `^` off the front (recording `anchoredStart: true`) and `$` off the end (`anchoredEnd`). Each pass through the loop reads one atom — a `.`, an escaped character, a `[...]` class (handed to `parseClass`), or a plain character — then checks whether `*`, `+`, or `?` follows and attaches it:

```js
let quant = null;
if ('*+?'.includes(source[i])) { quant = source[i]; i++; }
nodes.push({ atom, quant });
```

`parseClass` turns `[a-z0-9_]` into `{kind: 'class', negated, chars: Set, ranges: [[97,122],[48,57]]}` — ranges stored as character-code pairs so matching is just number comparison. Malformed input throws immediately: `*a` → "nothing to repeat", `[abc` → "Unclosed [". Catching bad patterns at parse time, once, beats discovering them mid-match.

`atomMatches(atom, ch)` is the one place that asks "does this single atom match this single character?" — a `switch` on the atom's kind. Note the first line: `if (ch === undefined) return false;` — walking off the end of the text just means "no match," no crash.

**Stage 2: `test(pattern, text)` and the backtracking matcher.**

```js
const starts = anchoredStart ? [0] : Array.from({ length: text.length + 1 }, (_, k) => k);
return starts.some((start) => matchHere(nodes, 0, text, start, anchoredEnd));
```

Unanchored by default: build the list of every starting position and try each (`.some` stops at the first success). `^` shrinks the list to just `[0]`. That's the entire fix for Flaw 2 — two lines.

The heart is the quantifier case in `matchHere`:

```js
let k = t;
if (quant === '+') {
  if (!atomMatches(atom, text[k])) return false;
  k++;
}
while (true) {
  if (matchHere(nodes, n + 1, text, k, anchoredEnd)) return true; // this split works
  if (!atomMatches(atom, text[k])) return false; // no more to consume: defeat
  k++; // consume one more, try again
}
```

Read it slowly — this is the whole lesson. `k` is how much text the quantifier has consumed so far. First, consume the *minimum* (`+` requires one; `*` requires none). Then loop: **ask if the rest of the pattern matches from here** (the recursive call with `n + 1`). If yes, done. If no, try to consume one more character; if the atom won't even match the next character, every possible split has been tried — genuine failure. Each failed recursive call unwound its own work automatically. Trace `a*a` vs `"aaa"`: k=0 → rest (`a`) matches at position 0? yes, actually — `a` matches the first "a"... but then pattern is done and it's `true` immediately. Try `.*x` vs `"abcx"`: k=0 → rest wants `x` at "a", no → k=1 → `x` at "b", no → k=2 → `x` at "c", no → k=3 → `x` at "x", **yes**. The star ate exactly 3, because 3 was what let the rest succeed.

The `?` case tries "consume one" first, then falls back to "consume zero." The end-of-pattern base case checks the `$` anchor: `return anchoredEnd ? t === text.length : true;`.

**The tests (`regex.test.js`).** Each test feeds pattern/text pairs to `reTest` and asserts the answer with Node's built-in `assert.equal`. Three highlights: the first test is the original's exact failure (`a*a` vs `"aaa"` must be `true` now); the "agreement spot-check" runs the same cases through JavaScript's real `RegExp` and demands identical answers — using the platform as referee, so our engine isn't just self-consistent, it's *correct*; and the malformed-pattern test uses `assert.throws(fn, /message/)` to check that garbage input fails loudly with the right message.

## 7. Words you learned (glossary)

- **Regex** — a pattern mini-language for matching text.
- **Regex engine** — the code that decides whether a pattern matches a text.
- **Quantifier** — `*` (0+), `+` (1+), `?` (0 or 1): how many times an atom repeats.
- **Atom** — one matchable unit: a character, `.`, or a class.
- **Character class** — `[abc]` / `[a-z]` / `[^...]`: match any one character from a set/range, or (negated) any character not in it.
- **Anchor** — `^` (must start at text start) / `$` (must end at text end).
- **Escape** — `\.` makes a special character literal.
- **Greedy** — consuming as many characters as possible.
- **Backtracking** — try a choice, recurse; on failure, undo and try the next choice.
- **Choice point** — a moment where the algorithm could proceed multiple ways (each split of a quantifier).
- **Recursion** — a function calling itself on a smaller subproblem.
- **Call stack** — the runtime's list of in-progress function calls; unwinding it is backtracking's free "undo."
- **Parse** — convert raw syntax into structured data (here: `{atom, quant}` nodes) before doing the real work.
- **SyntaxError** — JavaScript's error type for malformed input, thrown here for bad patterns.
- **Anchored / unanchored** — must match at position 0 vs may be found at any position.
- **ReDoS** — "regex denial of service": patterns like `(a+)+$` whose choice points multiply until matching takes practically forever.

## 8. Experiments to try on the plane (no internet needed)

Run tests with `node --test 72-regex-engine/` — all offline.

1. **Watch the bug, then the fix.** Run `node 72-regex-engine/original.js` and see `a*a vs "aaa": false`. Then in Node, `import { test } from './refactored/regex.js'` (or add a `console.log(test('a*a','aaa'))` line to a scratch file) and see `true`.
2. **Count the backtracks.** In `regex.js`, add a counter: `let calls = 0;` at module level and `calls++` at the top of `matchHere`; log it after a match. Compare `test('a*b', 'aaab')` against `test('a*b', 'aaac')` — failure explores *every* split; success stops early.
3. **Make `*` lazy instead of greedy.** In the quantifier loop, our engine already tries the minimum first — that's actually "lazy" order! Flip it: consume ALL matching characters first, then give back one at a time, retrying the rest after each give-back. All tests should still pass — order of exploration changes performance, not the yes/no answer.
4. **Add `\d` as a digit shorthand.** In `parsePattern`'s escape branch, when the escaped character is `d`, return a class atom instead: `{kind:'class', negated:false, chars:new Set(), ranges:[[48,57]]}` (48–57 are the codes for 0–9). Test: `test('^\\d+$', '2026')` → `true`, `test('^\\d+$', '20x6')` → `false`.
5. **Feel a baby ReDoS.** Time `test('a*a*a*a*a*b', 'aaaaaaaaaaaaaaaaaaaaaaaa')` (no `b` at the end, so it must fail) with `console.time('redos')` / `console.timeEnd('redos')`. Add more `a*`s and more a's and watch the time explode — that's exponential choice points, the reason production engines like RE2 use a different algorithm entirely.
