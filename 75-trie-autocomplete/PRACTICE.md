# 🏋️ Practice: Trie Autocomplete

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Exercises 2, 3, 4 and 5 add methods **inside** the class (they need `#root`, which outsiders can't reach) — work on a **copy** of `refactored/trie.js`. Exercises 1 and 6 need no changes to the trie at all.

## Exercises

### ⭐ 1. Path, word, and the difference between them (warm-up)

No code changes. On the demo dictionary from `cli.js`, work out — *before running* — the answers to: `has('do')`, `has('doo')`, `suggest('doo', 20)`, and `suggest('dooz', 20)`. Then check them. Explain in one sentence why `has('doo')` is `false` even though `suggest('doo', 20)` returns two words, and why `suggest('dooz', 20)` returns `[]` rather than throwing.

What it practices: the single distinction the whole structure rests on — a node can be *on the way to* words without *being* one.

Hint: `has` asks "is there a `word` at the end of this path?"; `suggest` asks "what's underneath this path?"; `dooz` walks off the end of the tree and `#find` returns `null`.

### ⭐⭐ 2. nodeCount() — measuring what sharing buys (core)

Add `nodeCount()`, returning how many nodes the trie holds (root included), by recursing through `children`. Then measure the memory half of the trie's bargain: build one trie from 200 words that all start with `prefix` (`prefix0` … `prefix199`), and another from 200 unrelated 5-letter words. Compare. Also check the tiny cases: an empty trie is `1` node, and `car` + `cart` together are `5` (root + `c`,`a`,`r`,`t`).

What it practices: turning "shared prefixes save memory" from a claim you were told into a number you measured.

Hint: the same recursion shape as `#collect`, counting instead of pushing: `let total = 1; for (const c of Object.keys(node.children)) total += walk(node.children[c]);`

### ⭐⭐ 3. countUnder(prefix) in O(prefix length) (core)

A search box wants to show "1,923 results" the instant you type `v` — without building a list of 1,923 words. Add a `below` counter to every node, incremented on the way down during `insert`, so `countUnder(prefix)` is just "walk the prefix, read one number." Check offline with `car, cart, carton, cat, do, dog`: `countUnder('')` → 6, `countUnder('car')` → 3, `countUnder('ca')` → 4, `countUnder('d')` → 2, `countUnder('z')` → 0. Then the trap: `insert('car', 99)` and `insert('CAR', 5)` must leave every count unchanged, while `insert('care')` bumps `''` to 7 and `'car'` to 4.

What it practices: **precomputing during writes to make reads free** — the same trade as an index, one level down. Note the cost: `insert` now maintains a second thing, so you must decide whether that sync rule is worth it (project 41 says be suspicious).

Hint: increment the root too, or `countUnder('')` will be wrong. And re-inserting an existing word must *not* increment again — check the `word === null` flag like `size` does.

### ⭐⭐ 4. suggestBy — ranking as a parameter (core)

`suggest` hardcodes `byPopularity`. Add `suggestBy(prefix, limit, compare)` that takes the comparator from the caller, so the same traversal serves "most popular", "shortest first", and "alphabetical" without duplicating a single line of tree-walking. Check offline with `careful`(5), `car`(90), `cart`(25), `carton`(3): ranked by length → `['car','cart','carton','careful']`; alphabetically with limit 2 → `['car','careful']`; an unmatched prefix → `[]`.

What it practices: spotting which part of a function is *policy* (the ranking) and which is *mechanism* (the walk), then letting the caller supply the policy — project 74 did the same with its comparator.

Hint: your comparator receives `{ word, weight }` entries, not bare strings. That's a deliberate API choice — write down why it's more useful than passing strings.

### ⭐⭐⭐ 5. delete(word) that prunes (challenge)

Remove a word and return `true`/`false` for whether it was there. The hard half: don't leave a dead trail of nodes behind. After deleting `carton` from a trie that also holds `cart`, the `o` and `n` nodes must be **gone**, but `c`,`a`,`r`,`t` must survive. And deleting `do` from a trie holding `door` must leave `door` completely intact. Check offline with `car, cart, carton, cat, do, door`: `delete('carton')` → `true`, again → `false`, `size` → 5, `suggest('car')` → `['car','cart']`; then `delete('do')` → `true` and `suggest('do')` → `['door']`; `delete('nope')` → `false`, `delete('ca')` → `false`. Finally, assert `nodeCount()` actually *dropped* after a delete.

What it practices: recursion that does work **on the way back up**. You can only know whether a child is safe to prune after the recursive call has returned.

Hint: recurse down to the end of the word, clear its `word`, and then — as each call returns — delete the child you just visited *if* it now has no `word` and no `children` of its own. Two conditions, both necessary.

### ⭐⭐⭐ 6. Fuzz the trie against the naive scan (challenge)

No trie changes. The original's dumb scan is *slow*, not *wrong* — which makes it a perfect **oracle**. Write a test that, 300 times, builds a random dictionary (up to 12 words, length 1–4, from the alphabet `abc`, random weights 0–4), inserts it into a `Trie`, and then for every prefix in `['', 'a', 'b', 'ab', 'abc', 'z']` and every limit in `[0, 1, 3, 100]` asserts the trie's answer equals a filter-map-sort-slice over the plain array. Include the failing input in the assertion message.

What it practices: **oracle testing** (project 72 does this against `RegExp`) — you don't have to imagine the edge cases when a slow-but-obvious implementation can generate the right answer for you.

Hint: the tiny alphabet is the point — three letters and length 4 guarantee collisions, shared prefixes, and words that are prefixes of other words, which is where bugs hide. Mirror the trie's overwrite-on-reinsert rule in your oracle or you'll chase a phantom mismatch.

## Solutions

### 1. Path, word, and the difference between them

```js
assert.equal(trie.has('do'), true);    // a word ends here
assert.equal(trie.has('doo'), false);  // a real path, but no word ends here
assert.deepEqual(trie.suggest('doo', 20), ['door', 'Doorbell']);
assert.deepEqual(trie.suggest('dooz', 20), []);
assert.deepEqual(trie.suggest('do', 20), [
  'dog', 'do', 'down', 'download', 'door', 'does',
  'dot', 'double', 'Downtown', 'Doorbell', 'dodge',
]);
```

WHY: `doo` is a hallway, not a room. Two words pass through it, so the subtree beneath it is non-empty, but nothing *ends* there — which is precisely what `node.word === null` records. Splitting "is this a path?" from "is this a word?" into two fields is what lets one structure answer both questions, and it's why `do`, `door` and `doorbell` can all coexist on the same chain. `dooz` returns `[]` rather than throwing because `#find` returns `null` for a path that runs out, and `suggest` translates that into "no matches" — the empty *value* the original could only express as a blank line. Verified by running; note the full `do` ranking is by weight (`dog` 95 first, `dodge` 4 last), not alphabet.

### 2. nodeCount()

```js
nodeCount() {
  const walk = (node) => {
    let total = 1;
    for (const character of Object.keys(node.children)) total += walk(node.children[character]);
    return total;
  };
  return walk(this.#root);
}
```

WHY: 200 words sharing the prefix `prefix` occupy **207 nodes**; 200 unrelated 5-letter words occupy **827** — four times more, for the same word count. The 6-character shared prefix is stored exactly once instead of 200 times, and that is the compression a trie buys. It also explains when a trie is a *bad* idea: a dictionary of long, unrelated strings gets you close to one node per character, and each node is a whole JavaScript object with an `Object.create(null)` inside it — far heavier than the string it replaced. `car` + `cart` = 5 nodes is the sanity check worth keeping: root, `c`, `a`, `r`, `t`, with `r` and `t` both carrying a word. Verified by running.

### 3. countUnder(prefix)

```js
// in makeNode(): below: 0
insert(word, weight = 1) {
  const key = this.#key(word);
  // ...the existing validation stays exactly as it is...
  let node = this.#root;
  const isNew = !this.has(word);         // decide BEFORE mutating
  if (isNew) this.#root.below++;
  for (const character of key) {
    node.children[character] ??= makeNode();
    node = node.children[character];
    if (isNew) node.below++;
  }
  if (node.word === null) this.#size++;
  node.word = word;
  node.weight = weight;
  return this;
}

countUnder(prefix) {
  const node = this.#find(this.#key(prefix));
  return node === null ? 0 : node.below;
}
```

WHY: this is the index trick applied recursively — every node caches an answer about its own subtree, so a question that would cost O(matches) to compute costs O(prefix length) to look up. `countUnder('v')` returns 1,923 without touching 1,923 words. But be honest about the price: you have just created a **sync rule** of exactly the kind project 41 warns about — `below` must be maintained by every write, forever, and the `isNew` guard exists because re-inserting a word must not inflate the counts. Adding a `delete` (exercise 5) means remembering to decrement all the way down too. Worth it for a search box that shows a result count; not worth it otherwise. Verified by running all five counts plus the re-insert traps — including `insert('CAR')`, which `#key` folds to an existing word, so `has` catches it and the counts stay honest.

### 4. suggestBy

```js
suggestBy(prefix, limit, compare) {
  const node = this.#find(this.#key(prefix));
  if (node === null) return [];
  const matches = [];
  this.#collect(node, matches);
  return matches.sort(compare).slice(0, limit).map((entry) => entry.word);
}
```

```js
const byLength = (a, b) => a.word.length - b.word.length || a.word.localeCompare(b.word);
assert.deepEqual(trie.suggestBy('car', 10, byLength), ['car', 'cart', 'carton', 'careful']);
```

WHY: `suggest` and `suggestBy` differ by one word — `byPopularity` versus `compare` — which is the tell that ranking was never really part of the trie's job. The traversal is *mechanism* (how to find the candidates) and the ordering is *policy* (which ones a human wants first); policy changes constantly, mechanism almost never, so letting the caller pass policy in stops product decisions from touching data-structure code. Passing `{ word, weight }` rather than bare strings matters: a comparator that only sees strings can never rank by popularity, so the richer shape keeps every ranking expressible. The honest next step is to make `suggest` simply call `suggestBy(prefix, limit, byPopularity)` so there is one traversal in the file rather than two. Verified by running.

### 5. delete(word) that prunes

```js
delete(word) {
  const key = this.#key(word);

  const prune = (node, depth) => {
    if (depth === key.length) {
      if (node.word === null) return false;   // path exists, but not as a word
      node.word = null;
      node.weight = 0;
      this.#size--;
      return true;
    }
    const character = key[depth];
    const child = node.children[character];
    if (child === undefined) return false;    // path ran out

    const removed = prune(child, depth + 1);
    // ON THE WAY BACK UP: is this child now useless?
    const dead = child.word === null && Object.keys(child.children).length === 0;
    if (removed && dead) delete node.children[character];
    return removed;
  };

  return prune(this.#root, 0);
}
```

WHY: the two conditions in `dead` are the whole exercise. `child.word === null` stops you deleting `do` while removing `door` — the node is still somebody's word. `Object.keys(child.children).length === 0` stops you deleting `cart` while removing `carton` — the node is still somebody's path. Miss either and you silently destroy unrelated words, the worst kind of bug in a structure whose entire premise is sharing. And the pruning has to happen **after** the recursive call returns, because "does this child still matter?" is only answerable once the deletion below it has finished — a loop going downwards genuinely cannot do this, which is the clearest argument for recursion you'll meet in this repo. Verified by running: `carton` gone with `cart` intact, `do` gone with `door` intact, `delete('ca')` correctly `false`, and `nodeCount()` dropping from 10 to 6, proving the nodes were really freed and not just unmarked.

### 6. Fuzz against the naive scan

```js
const naiveSuggest = (words, weights, prefix, limit) =>
  words
    .filter((w) => w.toLowerCase().startsWith(prefix.toLowerCase()))
    .map((word) => ({ word, weight: weights[word] }))
    .sort(byPopularity)
    .slice(0, limit)
    .map((entry) => entry.word);

test('FUZZ: the trie agrees with a dumb scan on random dictionaries', () => {
  for (let trial = 0; trial < 300; trial++) {
    const words = [];
    const weights = {};
    const count = 1 + Math.floor(Math.random() * 12);
    for (let i = 0; i < count; i++) {
      const length = 1 + Math.floor(Math.random() * 4);
      let word = '';
      for (let k = 0; k < length; k++) word += 'abc'[Math.floor(Math.random() * 3)];
      if (!(word in weights)) words.push(word);
      weights[word] = Math.floor(Math.random() * 5); // re-insert overwrites
    }

    const trie = new Trie();
    for (const word of words) trie.insert(word, weights[word]);

    for (const prefix of ['', 'a', 'b', 'ab', 'abc', 'z']) {
      for (const limit of [0, 1, 3, 100]) {
        assert.deepEqual(
          trie.suggest(prefix, limit),
          naiveSuggest(words, weights, prefix, limit),
          `prefix="${prefix}" limit=${limit} words=${JSON.stringify(words)}`,
        );
      }
    }
  }
});
```

WHY: 7,200 comparisons against an implementation that is obviously correct because it is obviously stupid. That's the point of an oracle — the naive scan's *only* sin was being slow, so it remains a perfect judge of what the fast version should say. The three-letter alphabet is doing real work: it forces duplicate words, deep shared prefixes, and words that are prefixes of other words, which is exactly the terrain where a hand-written test suite has blind spots. Two details that will bite you if you skip them: the oracle must mirror the trie's *overwrite-on-reinsert* rule (hence keying `weights` by word), and the assertion message must print the generated dictionary — a fuzz failure you can't reproduce is barely better than no test. Verified by running: 300 trials pass.
