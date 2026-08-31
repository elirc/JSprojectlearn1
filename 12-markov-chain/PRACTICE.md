# 🏋️ Practice: Markov Chain Sentence Generator

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Vocabulary (warm-up)

Write `vocabulary(chain)` that returns a sorted array of *every* word the chain knows about. Careful: the source's last word is never a key (nothing follows it), so the keys alone are not enough — you must also collect the followers. Check: `vocabulary(buildChain('the cat sat the cat ran'))` returns `['cat', 'ran', 'sat', 'the']` (note `ran` is there even though `chain.get('ran')` is `undefined`), and an empty chain gives `[]`.

What it practices: reading a `Map` you built — keys, values, and the one word that hides in the values only.

Hint: start a `Set` from `chain.keys()`, then add every word from every follower array.

### ⭐⭐ 2. Follower counts (core)

The duplicates in a follower list *are* the probabilities — make them visible. Write `followerCounts(chain, word)` returning a `Map` from each follower to how many times it appeared. Check: for `buildChain('the cat sat the cat ran the dog')`, `followerCounts(chain, 'the')` deep-equals `new Map([['cat', 2], ['dog', 1]])`, and an unknown word gives an empty `Map`.

What it practices: the tally pattern, and treating the chain as plain queryable data.

Hint: `counts.set(f, (counts.get(f) ?? 0) + 1)` is the whole trick; `chain.get(word) ?? []` handles unknown words without an `if`.

### ⭐⭐ 3. Pin down maxWords with tests (core)

No existing test proves the length promise. Add two tests: (a) generating 50 sentences with `maxWords: 5` from any chain never yields more than 5 words (split the result and count); (b) `generateSentence(buildChain('a b a c'), { maxWords: 1, start: 'a' })` returns exactly `'a'`. Both should pass with the current code — and (b) would fail if the `while` condition were `<=` instead of `<`.

What it practices: testing a *bound* on random output when you can't test the exact value.

Hint: for (a), real `Math.random` is fine — you're asserting a property that must hold every run.

### ⭐⭐ 4. A stopAt option (core)

Add a `stopAt` option to `generateSentence`: after the sentence hops onto that exact word, it ends early (the stop word stays in the output). Check deterministically: with `buildChain('a b a c')` and `rng: () => 0`, `{ start: 'a', stopAt: 'b', maxWords: 10 }` returns `'a b'`, while the same call without `stopAt` returns `'a b a b a'` at `maxWords: 5`.

What it practices: growing an options object without disturbing existing callers or tests.

Hint: one `if (word === stopAt) break;` placed *after* the `push` — order matters for whether the stop word appears.

### ⭐⭐⭐ 5. An order-2 chain (challenge)

LEARN.md's last experiment had you sketch this on paper — now build it. Write `buildChain2(text)` where each key is *two* consecutive words joined with a space (`'the cat'`) and the values are the words that followed that pair; and `generateSentence2(chain, { maxWords, start, rng })` where `start` is a two-word key and each hop rebuilds the key from the last two words of the sentence. Check deterministically: for `buildChain2('a b c a b d')`, the chain maps `'a b' → ['c', 'd']`, `'b c' → ['a']`, `'c a' → ['b']`; and `generateSentence2` with `{ start: 'a b', maxWords: 6, rng: () => 0 }` returns `'a b c a b c'`.

What it practices: the payoff of chain-as-data — the model gets smarter and the Map interface bends without breaking.

Hint: build keys with `` `${words[i]} ${words[i + 1]}` `` and loop only to `words.length - 2`. In generation, seed the sentence with `key.split(' ')` so `maxWords` counts real words.

## Solutions

### 1. Vocabulary

```js
export function vocabulary(chain) {
  const words = new Set(chain.keys());
  for (const followers of chain.values()) {
    for (const word of followers) words.add(word);
  }
  return [...words].sort();
}
```

WHY: the build loop stops at `words.length - 1`, so the final word exists only inside follower arrays — a subtle consequence of the data structure that this function makes you confront. A `Set` erases the duplicates (which are probabilities, not vocabulary), and sorting makes the output testable with `assert.deepEqual` despite `Map` iteration order.

### 2. Follower counts

```js
export function followerCounts(chain, word) {
  const counts = new Map();
  for (const follower of chain.get(word) ?? []) {
    counts.set(follower, (counts.get(follower) ?? 0) + 1);
  }
  return counts;
}
```

WHY: this is a pure *use-phase* function — it queries the model without touching how it was built, which is exactly what the build/use split buys you. The `?? []` fallback turns "unknown word" into a graceful empty answer instead of a crash, the same courtesy `generateSentence` shows dead ends. It also proves the README's point: `['cat', 'cat', 'dog']` really was a 2-to-1 probability table all along.

### 3. Pin down maxWords with tests

```js
test('output never exceeds maxWords', () => {
  const chain = buildChain('the cat sat on the mat the dog ate the fish');
  for (let i = 0; i < 50; i++) {
    const words = generateSentence(chain, { maxWords: 5 }).split(' ');
    assert.ok(words.length <= 5, `too long: ${words.join(' ')}`);
  }
});

test('maxWords: 1 returns just the start word', () => {
  assert.equal(generateSentence(buildChain('a b a c'), { maxWords: 1, start: 'a' }), 'a');
});
```

WHY: you can't predict random output, but you can assert a property that must hold on every run — the same idea as the project's adjacent-pairs invariant test, applied to length. The `maxWords: 1` case is the sharpest edge: the sentence already holds one word before the loop, so `while (sentence.length < maxWords)` must never run — an `<=` typo would return `'a b'` and fail loudly.

### 4. A stopAt option

```js
export function generateSentence(chain, {
  maxWords = 20,
  start,
  stopAt,
  rng = Math.random,
} = {}) {
  if (chain.size === 0) return '';
  const pickFrom = (array) => array[Math.floor(rng() * array.length)];
  let word = start ?? pickFrom([...chain.keys()]);
  const sentence = [word];
  while (sentence.length < maxWords) {
    const followers = chain.get(word);
    if (!followers) break; // dead end: last word of the source text
    word = pickFrom(followers);
    sentence.push(word);
    if (word === stopAt) break;
  }
  return sentence.join(' ');
}
```

WHY: a new named option with no default behavior change — callers who don't pass `stopAt` compare `word === undefined`, which no real word matches, so every existing test still passes. That's project 11's options-object lesson: growth without breakage. Placing the `break` after the `push` keeps the stop word in the output, and the fixed-rng check (`'a b'`) makes the behavior exactly testable.

### 5. An order-2 chain

```js
export function buildChain2(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chain = new Map();
  for (let i = 0; i < words.length - 2; i++) {
    const key = `${words[i]} ${words[i + 1]}`;
    if (!chain.has(key)) chain.set(key, []);
    chain.get(key).push(words[i + 2]);
  }
  return chain;
}

export function generateSentence2(chain, { maxWords = 20, start, rng = Math.random } = {}) {
  if (chain.size === 0) return '';
  const pickFrom = (array) => array[Math.floor(rng() * array.length)];
  let key = start ?? pickFrom([...chain.keys()]);
  const sentence = key.split(' ');
  while (sentence.length < maxWords) {
    const followers = chain.get(key);
    if (!followers) break; // this two-word ending never continued in the source
    const next = pickFrom(followers);
    sentence.push(next);
    key = `${sentence[sentence.length - 2]} ${next}`;
  }
  return sentence.join(' ');
}
```

WHY: the state grew from one word to two, yet the interface between the phases is still "Map from state to followers" — build once, generate many times, dead ends break gracefully, `rng` stays injectable. Only the *key-making* changed, in exactly two places. Verified by running: the deterministic walk gives `'a b c a b c'`, and a stronger version of the project's invariant holds — across 50 random sentences, every adjacent *triple* of output words appeared consecutively in the source, which is the defining property of an order-2 chain.
