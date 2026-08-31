# 🏋️ Practice: CSV Parser

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. The third line ending (warm-up)

The tests cover `\n` and `\r\n` — but old Mac exports ended lines with a lone `\r`. Read the parser's newline branch and predict what `parseCsv('a,b\rc,d')` returns, then pin it with a test. Expected: `[['a','b'], ['c','d']]` — it already works, and now nobody can "simplify" that branch away. Add `'a,b\rc,d\r'` too (trailing `\r`, still two rows).

**Practices:** reading a state machine branch-by-branch before trusting it.

**Hint:** the condition is `char === '\n' || char === '\r'` — the CRLF skip is only the *pairing* rule.

### ⭐⭐ 2. The delimiter as a parameter (core)

European Excel exports use semicolons (because `1,5` is how those locales write 1.5!), and TSV uses tabs. Give `parseCsv` an options argument: `parseCsv(text, { delimiter = ',' } = {})`, changing exactly one comparison in the loop. Expected: `'a;b\nc;d'` with `';'` gives `[['a','b'],['c','d']]`; `'1,5;2,5'` with `';'` gives `[['1,5','2,5']]` (commas are now plain text); and every existing test still passes untouched.

**Practices:** turning a hardcoded constant into configuration without disturbing the machine.

**Hint:** `else if (char === delimiter) endField();`.

### ⭐⭐ 3. Strict mode: unclosed quotes should shout (core)

Feed the current parser `'"abc'` — it silently pretends the quote was closed (`[['abc']]`; write that test first to document it). Then add a `strict` option: after the loop, if `inQuotes` is still `true`, throw a `SyntaxError('Unclosed quote at end of input')`. Expected: strict mode throws for `'"abc'` and `'a,"b\nc'`, returns normal results for valid input, and lenient mode keeps its old forgiving behavior.

**Practices:** project 30's lesson meeting this parser — a malformed file is an *expected* failure that deserves a loud, typed error.

**Hint:** the leftover state at loop end *is* the diagnosis: still inside quotes means the file ended mid-field.

### ⭐⭐ 4. `stringifyCsv` — the inverse function (core)

Write `stringifyCsv(rows)` turning rows back into CSV text: fields containing `,`, `"`, `\r`, or `\n` get wrapped in quotes with inner quotes doubled; everything else stays bare. Expected: `[['a','b'],['c','d']]` → `'a,b\nc,d'`; `[['simple, but no simpler']]` → `'"simple, but no simpler"'`; `[['she said "later"']]` → `'"she said ""later"""'`. Then the real test: `parseCsv(stringifyCsv(nastyRows))` deep-equals `nastyRows` for a table containing commas, quotes, and embedded newlines.

**Practices:** escaping — the mirror image of parsing — and round-trip thinking.

**Hint:** one helper: `/[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text`.

### ⭐⭐⭐ 5. A property test: 100 random nasty tables (challenge)

Instead of hand-picking cases, generate them: build 100 random tables (1–4 rows, 2–4 fields each) drawing fields from an alphabet of horrors — `'a,b'`, `'q"q'`, `'nl\nnl'`, `''`, `'cr\rcr'`, `'dq""dq'`, `'"'` — and assert the round-trip `parseCsv(stringifyCsv(rows))` equals `rows` every time. Use a tiny seeded random generator so failures reproduce. Expected: passes; then sabotage `stringifyCsv` (stop doubling quotes) and watch it fail within a few trials. One rule: keep rows at 2+ fields — a row that is a *single empty field* stringifies to an empty line, which CSV text cannot distinguish from no row at all.

**Practices:** property-based testing — asserting a *law* over random inputs instead of examples.

**Hint:** a seeded generator in two lines: `seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n;`.

## Solutions

### 1. Lone-`\r` test

```js
test('lone \\r line endings also end rows', () => {
  assert.deepEqual(parseCsv('a,b\rc,d'), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(parseCsv('a,b\rc,d\r'), [['a', 'b'], ['c', 'd']]);
});
```

**Why:** the branch accepts `\r` *or* `\n` as a row ending and only uses the look-ahead to swallow the `\n` of a CRLF pair — so lone `\r` was already handled, just never promised. A behavior without a test is a behavior someone will delete.

### 2. Delimiter parameter

```js
export function parseCsv(text, { delimiter = ',' } = {}) {
  // ... identical, except:
  else if (char === delimiter) endField();
```

**Why:** the state machine's *structure* (quote memory, row endings) is delimiter-agnostic — only the "what ends a field" event was ever comma-specific. Defaulting the option keeps the old signature working, which the untouched test suite proves. Verified with `;`, `\t`, and the default.

### 3. Strict mode

```js
export function parseCsv(text, { delimiter = ',', strict = false } = {}) {
  // ... the whole loop unchanged ...
  if (strict && inQuotes) {
    throw new SyntaxError('Unclosed quote at end of input');
  }
  if (field !== '' || row.length > 0) endRow();
  return rows;
}
```

**Why:** `inQuotes` still being true after the last character is the machine's own evidence that the input was malformed — no re-scanning needed. Throwing a `SyntaxError` (a real class, project 30 style) lets a boundary distinguish "bad file" from "our bug". Verified: `'"abc'` and `'a,"b\nc'` throw in strict mode; valid input parses identically.

### 4. `stringifyCsv`

```js
export function stringifyCsv(rows) {
  const escapeField = (value) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((row) => row.map(escapeField).join(',')).join('\n');
}
```

**Why:** writing the escaper forces you to articulate the format's rules in reverse: exactly the characters that have *contextual meaning* trigger quoting, and the `""` doubling is the same look-ahead rule the parser undoes. The round-trip assertion is the honest definition of "these two functions agree". Verified against commas, quotes, and embedded newlines.

### 5. Property test

```js
test('property: 100 random nasty tables round-trip', () => {
  const alphabet = ['plain', 'a,b', 'q"q', 'nl\nnl', '', 'cr\rcr', 'dq""dq', ' spaced ', '"'];
  let seed = 42;
  const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let trial = 0; trial < 100; trial++) {
    const rows = Array.from({ length: 1 + rand(4) }, () =>
      Array.from({ length: 2 + rand(3) }, () => alphabet[rand(alphabet.length)]));
    assert.deepEqual(parseCsv(stringifyCsv(rows)), rows);
  }
});
```

**Why:** examples test cases you thought of; properties test the *law* — here, "stringify then parse is the identity" — across combinations no one would hand-write (a `"` field next to a `\r` field on the same row). The fixed seed keeps it deterministic and offline-repeatable. The 2+-fields rule documents a real CSV ambiguity rather than hiding it. Verified: 100/100 trials pass with node.
