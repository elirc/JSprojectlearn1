# 🏋️ Practice: JSON Parser from Scratch

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Token X-ray (warm-up)

Without calling `parseJson` at all, use `tokenize` from `refactored/json.js` to inspect the input `'{"on": [true, 1.5]}'`. Write a tiny script that prints just the token *types*, space-separated, in order. Before running it, write down your prediction.

What it practices: seeing stage 1 (tokenizer) as a standalone, inspectable tool.
Hint: every token is `{type, value, pos}` — `.map()` over the array and join.

Expected output: `lbrace string colon lbracket literal comma number rbracket rbrace eof`

### ⭐⭐ 2. A safe fallback wrapper (core)

Write `parseJsonOr(text, fallback)` — a function that returns the parsed value, but returns `fallback` instead of throwing when the text is invalid JSON. Crucially, it must only swallow *JSON syntax* problems: any other kind of error (say, someone passes a number instead of a string) must still be thrown. This is the standard pattern for reading an optional config file.

What it practices: typed errors — `JsonError` exists precisely so callers can tell "bad input" apart from "my bug".
Hint: `try/catch`, then `err instanceof JsonError`.

Expected: `parseJsonOr('{"a": 1}', null)` → `{a: 1}`; `parseJsonOr('{oops}', {b: 2})` → `{b: 2}`; `parseJsonOr(42, 'x')` throws a `TypeError`.

### ⭐⭐ 3. Pin the duplicate-key behavior (core)

`json.test.js` never says what `{"a": 1, "a": 2}` should mean — duplicate keys are legal-ish JSON that real parsers resolve as "last one wins". Write a test (in a scratch file, using `node:test` like the existing suite) asserting that `parseJson` produces `{a: 2}`, and that it agrees with `JSON.parse` on both that input and `'{"a": {"b": 1}, "a": [2]}'`.

What it practices: the round-trip trick — using the platform's parser as the referee for an *uncovered* edge case.
Hint: look at how `parseObject` writes into `obj[key.value]` — plain assignment already gives you an answer. Which one?

Expected: both assertions pass with no changes to `json.js` — the behavior falls out of the structure.

### ⭐⭐ 4. `maxDepth` — measure nesting with tokens only (core)

Write `maxDepth(text)` returning how deeply nested the JSON text is: `maxDepth('[[{"a": [1]}]]')` → 4, `maxDepth('42')` → 0. Do it *without* parsing — just walk the token array and count bracket tokens. The trap this must survive: brackets inside strings, like `'{"a": "}}}"}'`, must not confuse the count (expected: 1).

What it practices: why two stages pay off — the tokenizer already resolved strings, so "bracket in a string" is a non-problem at the token level.
Hint: `+1` on `lbrace`/`lbracket`, `-1` on `rbrace`/`rbracket`, track the running maximum.

Expected: `maxDepth('"[[["')` → 0 and `maxDepth('{"a": "}}}"}')` → 1.

### ⭐⭐⭐ 5. `stringify` — the other direction, plus a round-trip proof (challenge)

Write `stringify(value)`, the inverse of `parseJson`: it takes null, booleans, finite numbers, strings, arrays, and plain objects, and produces valid JSON text. The hard part is strings: `"` and `\` must be escaped, `\b \f \n \r \t` get their short escapes, and any other control character below space becomes `\u00XX`. Then prove it with a round-trip property test on a gnarly document: `parseJson(stringify(doc))` must deep-equal `doc`, and so must `JSON.parse(stringify(doc))`.

What it practices: the same spec, walked in reverse — and the property-test mindset (the spec is the referee, not your examples).
Hint: recursion mirrors `parseValue`: one branch per JSON type; arrays are `map` + `join(',')`, objects are `Object.entries`.

Expected: both round-trip assertions pass. Bonus check: for a doc built from those types, your output is *byte-identical* to `JSON.stringify(doc)`.

## Solutions

### 1. Token X-ray

```js
import { tokenize } from './refactored/json.js';
console.log(tokenize('{"on": [true, 1.5]}').map((t) => t.type).join(' '));
// -> lbrace string colon lbracket literal comma number rbracket rbrace eof
```

WHY: the refactor's whole safety-and-errors story rests on stage separation, and this shows stage 1 is a plain function you can poke at alone. Note `true` arrives as a `literal` token and `1.5` as one `number` token — the "words" are already resolved before the parser ever runs.

### 2. A safe fallback wrapper

```js
import { parseJson, JsonError } from './refactored/json.js';

export function parseJsonOr(text, fallback) {
  try {
    return parseJson(text);
  } catch (err) {
    if (err instanceof JsonError) return fallback;
    throw err; // not a syntax problem — that's OUR bug, let it fly
  }
}
```

WHY: this is the payoff of `class JsonError extends SyntaxError` — a *typed* error lets callers make decisions, not just read messages. Passing `42` throws a `TypeError` from deep inside (numbers have no `.slice`), and the wrapper correctly refuses to hide it: swallowing every error would turn programming mistakes into silent fallbacks.

### 3. Pin the duplicate-key behavior

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseJson } from './refactored/json.js';

test('duplicate keys: last one wins, agreeing with JSON.parse', () => {
  const doc = '{"a": 1, "a": 2}';
  assert.deepEqual(parseJson(doc), { a: 2 });
  assert.deepEqual(parseJson(doc), JSON.parse(doc));
  const nested = '{"a": {"b": 1}, "a": [2]}';
  assert.deepEqual(parseJson(nested), JSON.parse(nested)); // { a: [2] }
});
```

WHY: `parseObject` does `obj[key.value] = parseValue()` — assigning the same key twice simply overwrites, so "last wins" falls out of the structure with zero extra code, and it happens to be exactly what `JSON.parse` does. Pinning it in a test turns an accident into a documented decision: if someone later "fixes" duplicate handling, this test makes the format change loud.

### 4. `maxDepth`

```js
import { tokenize } from './refactored/json.js';

export function maxDepth(text) {
  let depth = 0;
  let max = 0;
  for (const token of tokenize(text)) {
    if (token.type === 'lbrace' || token.type === 'lbracket') max = Math.max(max, ++depth);
    if (token.type === 'rbrace' || token.type === 'rbracket') depth--;
  }
  return max;
}
// maxDepth('[[{"a": [1]}]]') -> 4    maxDepth('42') -> 0
// maxDepth('"[[["') -> 0            maxDepth('{"a": "}}}"}') -> 1
```

WHY: try writing this against raw *characters* and you'd have to re-implement string handling just to skip `"}}}"` — the exact code the tokenizer already contains. Reusing stage 1's output means brackets inside strings were never brackets at all: they're the guts of a single `string` token. This is the README's point that safety and correctness are *properties of the structure*.

### 5. `stringify` + round-trip proof

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseJson } from './refactored/json.js';

const STRING_ESCAPES = {
  '"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f',
  '\n': '\\n', '\r': '\\r', '\t': '\\t',
};

function quote(s) {
  let out = '"';
  for (const ch of s) {
    if (STRING_ESCAPES[ch]) out += STRING_ESCAPES[ch];
    else if (ch < ' ') out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
    else out += ch;
  }
  return out + '"';
}

export function stringify(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return quote(value);
  if (Array.isArray(value)) return '[' + value.map(stringify).join(',') + ']';
  return '{' + Object.entries(value).map(([k, v]) => quote(k) + ':' + stringify(v)).join(',') + '}';
}

test('round-trip: parse(stringify(x)) === x, and the platform agrees', () => {
  const gnarly = {
    a: [1, -2.5, 6.02e23, 'x"y\\z\n\ttab', null, true, {}],
    'weird " key': [[], { deep: [0] }],
    unicode: 'héllo ☃',
  };
  assert.deepEqual(parseJson(stringify(gnarly)), gnarly);  // our parser reads it back
  assert.deepEqual(JSON.parse(stringify(gnarly)), gnarly); // so does the platform
  assert.equal(stringify(gnarly), JSON.stringify(gnarly)); // byte-identical, even
});
```

WHY: writing the *encoder* forces you to face the same spec details the tokenizer handled — which characters must be escaped, and that everything else passes through raw. The property test is stronger than any example: it says "for this whole document, encoding then decoding is a no-op", with two independent decoders as referees. (All three assertions pass — verified with node.)
