# 📘 Learning Guide: Trie Autocomplete

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

The dropdown that appears under a search box. You type `ca`, and it offers `car`, `cat`, `card`, `care` — the most popular first, capped at five.

```
type "c"    -> car, cat, card, care, cart
type "ca"   -> car, cat, card, care, cart
type "car"  -> car, card, care, cart, careful
type "cart" -> cart, carton
type "z"    -> (no matches)
```

The obvious way is to scan the whole word list on every keystroke. That works on twenty words and falls over on fifty thousand. The refactor stores the words in a **trie**, where finding the matches stops being a search at all.

## 2. Concepts you need first

### `startsWith` and the shape of the problem

```js
console.log('carton'.startsWith('car')); // prints: true
console.log('cat'.startsWith('car'));    // prints: false
```

Simple, and that simplicity is the trap: it invites a loop over every word. Notice what the loop *knows and forgets* — after testing `c`, you know 48,000 words are irrelevant, and then you test them all again for `ca`.

### Objects as maps of one character

A plain object can map a single character to something else:

```js
const children = { c: 'node A', d: 'node B' };
console.log(children['c']);          // prints: node A
console.log(children['x']);          // prints: undefined
```

`undefined` for a missing key is the whole "no such path" test. You met object-as-lookup in projects 02 and 36; here each object holds at most a handful of letters.

### `Object.create(null)` — an object with no inherited baggage

`{}` secretly inherits members from `Object.prototype`:

```js
console.log({}.constructor);                  // prints: [Function: Object]
console.log(Object.create(null).constructor); // prints: undefined
```

For single characters that never bites, but the moment somebody stores multi-character keys the inherited `constructor` masquerades as real data. `Object.create(null)` makes a **bare object**: a dictionary and nothing else. It's a one-word habit that removes a whole class of surprise.

### `??=` — assign only if nullish

```js
const box = {};
box.value ??= 'first';
box.value ??= 'second';
console.log(box.value); // prints: first
```

`a ??= b` means "if `a` is `null` or `undefined`, set it to `b`." In the trie that's exactly "reuse the existing child node, or create one" — the single line that makes `car` and `cart` share a path.

### Trees, nodes, and recursion (recap of project 37)

A **node** is an object; its `children` hold more nodes. Walking everything below a node is naturally **recursive** — handle this node, then call yourself on each child:

```js
const shout = (node) => {
  if (node.word) console.log(node.word);
  for (const key of Object.keys(node.children)) shout(node.children[key]);
};
```

That's `#collect` in miniature. Project 37 built this muscle; here it does the harvesting.

### The trie itself: the path spells the word

Insert `car`, `cat`, `do`:

```
   root
    ├─ c ── a ──┬── r*      ("car")
    │           └── t*      ("cat")
    └─ d ── o*              ("do")
```

Two rules and you understand the whole structure:

1. **An edge is one character.** The word is not stored in any single node — it's spelled by the path you took to get there.
2. **A star means "a word ends here."** `do` is a word *and* a step on the way to `door`, so its node has both a `word` and children. That's why `has('ca')` is `false` while `has('car')` is `true`: `ca` is a real path, but no word ends there.

Now the payoff. "Every word starting with `ca`" requires **two steps** (follow `c`, follow `a`) and then a harvest of that subtree. Two steps for 20 words. Two steps for 20 million. Words beginning with `d` were eliminated by step one and are never examined again — not on this keystroke, not on the next.

### Prefix vs whole word

A **prefix** is any starting slice: `c`, `ca`, `car` are all prefixes of `car`. Autocomplete searches by prefix (`suggest`) but membership is about whole words (`has`). Keeping those two questions apart is why `word` is a separate field from `children`.

### Ranking, tie-breaks, and stability

Matches come out of a subtree in tree order, which is *alphabetical-ish* and meaningless to a user. So we rank by a weight (how often the word is picked), tie-broken alphabetically:

```js
const byPopularity = (a, b) => b.weight - a.weight || a.word.localeCompare(b.word);
```

`b.weight - a.weight` is descending (biggest first — the reverse of project 74's comparator). The `|| a.word.localeCompare(b.word)` makes equal weights come out in a **stable**, predictable order rather than depending on insertion history. `localeCompare` returns negative / 0 / positive, exactly the comparator contract.

### Build once, query many

A trie costs real time to build and real memory to hold. It repays that on every keystroke afterwards. This is the bargain behind every **index** — database indexes, search engines, `Map`s built before a loop (project 01's two-sum). Say it out loud before you build one: *am I going to query this enough times to earn the build back?*

## 3. Walking through the original code

One array, one popularity table:

```js
var words = ["cat", "car", "card", ...];
var popularity = { car: 90, card: 40, ... };
```

`suggest` scans everything:

```js
for (var i = 0; i < words.length; i++) {
  if (words[i].toLowerCase().startsWith(prefix.toLowerCase())) {
    matches.push(words[i]);
  }
}
matches.sort(function (a, b) { return (popularity[b] || 0) - (popularity[a] || 0); });
console.log("  " + prefix + " -> " + matches.slice(0, 5).join(", "));
```

Every word, every keystroke — *and* `prefix.toLowerCase()` is recomputed inside the loop, 50,000 times for one prefix. Then it prints, so the matches never become a value.

`suggestPopular` is the same function, pasted and edited:

```js
if (words[i].startsWith(prefix)) {   // the .toLowerCase() didn't survive the copy
```

Run the file. `suggest("doo")` prints `door, Doorbell`. `suggestPopular("doo")` prints `door`. Same dictionary, same prefix, one word quietly gone.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: it re-learns the same thing on every keystroke.** Imagine looking up "Smith" in a phone book by starting at page one and reading every name, then — for "Smi" — starting at page one again. That is the scan loop. The measured cost is in the output: 250,000 word examinations, 5.8 seconds, to type five letters. Worse, it's the *user* waiting, on every character, in the one interaction that has to feel instant.

**Flaw 2: two copies of the search, already disagreeing about case.** Nobody wrote a bug here; somebody copied a working function and later improved only one copy. Now `Doorbell` exists on one code path and not the other. Duplicated *logic* rots exactly like project 41's duplicated *data* — and it rots silently, because the wrong answer is a perfectly plausible-looking shorter list.

**Flaw 3: logic welded to I/O.** `suggest` prints; it returns `undefined`. So you cannot write `assert.deepEqual(suggest('cart'), ['cart', 'carton'])`, cannot render suggestions in a web dropdown, cannot count them, cannot log them. And look at the empty case: `z -> ` with nothing after the arrow. A function that returned `[]` would let the caller say "no matches"; a function that prints can only produce a blank.

## 5. Try it yourself first!

1. **Vague hint:** After the user types `c`, you know something enormous — every word starting with `d` is irrelevant. Where could you *store* that knowledge so the next keystroke inherits it?
2. **Warmer:** What if words that share a beginning shared storage? `car` and `cart` overlap for three letters. Draw that on paper as a tree.
3. **Warmer still:** Make each edge one character and each node an object of children. Then "all words starting with `ca`" = "walk `c`, walk `a`, harvest everything below."
4. **Almost the answer:** `insert` walks the word one character at a time, creating child objects as needed, and marks the final node with the word. `suggest` walks the prefix (returning `[]` if the path ends early), then recursively collects every marked node below.
5. **Design question:** where should case-folding happen — in `insert`, in `suggest`, or in one shared helper both call? And should `suggest('DOO')` return `Doorbell` or `doorbell`? Write down your answers; the refactor commits to one of each, and a test pins it down.

## 6. Understanding the refactored solution

**A node is three fields and nothing else:**

```js
const makeNode = () => ({
  children: Object.create(null),
  word: null,     // the original spelling, only where a word ends
  weight: 0,
});
```

`word` doubles as the "a word ends here" star *and* as storage for the original capitalisation — which is how `Doorbell` comes back spelled correctly even though it was matched in lowercase.

**Insert: walk and create as you go.**

```js
for (const character of key) {
  node.children[character] ??= makeNode();  // share the path if it exists
  node = node.children[character];
}
if (node.word === null) this.#size++;       // only count genuinely new words
node.word = word;
```

The `??=` is what makes prefixes shared rather than duplicated, and the `size` guard is what makes re-inserting a word an *update* instead of a phantom second entry.

**Find: walk, or fail early.**

```js
node = node.children[character];
if (node === undefined) return null;
```

`null` means "no word can possibly start with this," and `suggest` turns that into `[]`. That's the `z` case, answered in one link lookup rather than 50,000 comparisons.

**Suggest = find + collect + rank + slice.** Four separate steps, each replaceable. That's why exercise 5 in PRACTICE can swap the ranking without touching the traversal.

**One `#key` method** does all case-folding and all type-checking:

```js
#key(text) {
  if (typeof text !== 'string') throw new TypeError(...);
  return text.toLowerCase();
}
```

`insert`, `has` and `suggest` all call it. There is exactly one place where "how do we compare text?" is decided, so the original's two-copies-disagree bug has nowhere to live.

**The tests cover the corners the original couldn't express**: the empty prefix (whole dictionary, ranked), a prefix nothing matches, a prefix that walks off the path halfway (`carrot`), `limit` of 0 and of 999, `has('ca')` being false while `has('car')` is true, and a word that is a prefix of another (`do` / `door` / `doorbell`) surviving both ways.

## 7. Words you learned (glossary)

- **Trie** — a tree where the path from the root spells the key (from "re**trie**val").
- **Prefix** — any starting slice of a word.
- **Node / edge** — an object in the tree / the single character linking two nodes.
- **Terminal node** — one where a word ends; here, one with a non-null `word`.
- **Shared prefix** — the storage `car` and `cart` have in common.
- **Bare object** — `Object.create(null)`: a map with no inherited keys.
- **`??=`** — assign only if the target is `null` or `undefined`.
- **Depth-first traversal** — visit a node, then recurse into each child.
- **Comparator / tie-break / stable order** — see project 74; here, weight then alphabet.
- **`localeCompare`** — string comparison returning negative / 0 / positive.
- **Case-folding** — normalising case so `DOO` and `doo` match.
- **Index** — a structure built in advance to make later queries cheap.
- **Build once, query many** — the trade every index makes.
- **Autocomplete / typeahead** — suggesting completions as the user types.

## 8. Experiments to try on the plane (no internet needed)

1. **See the shared path.** In a scratch file, insert `car` and `cart` into a `Trie`, then `console.log(trie.suggest('car', 10))`. Expected: `[ 'car', 'cart' ]` — and only *one* `c → a → r` chain exists in memory holding both.
2. **Watch the field collapse.** Run `refactored/cli.js` and read the match counts for `v`, `vz`, `vzc`, `vzci`. Expected: 1923, 74, 3, 1 — while the scan examines 50,000 every single time. That gap *is* the project.
3. **Break the case rule.** In your own copy of `trie.js`, make `#key` return `text` unchanged and rerun the tests. Expected: the case-insensitivity test fails and `DOO` finds nothing — you have just re-created the original's `suggestPopular` bug on purpose.
4. **Prove `has` is not `suggest`.** Check `trie.has('ca')` and `trie.suggest('ca', 5)` on the demo dictionary. Expected: `false` and a list of five words. Same path, two different questions — write yourself a one-line comment explaining why both answers are right.
5. **Ranking is swappable.** Call `suggest` on a copy where you sort by `a.word.length - b.word.length` instead of `byPopularity`. Expected: shortest completions first — a different product decision, with the traversal untouched.
6. **Count the nodes.** Add a `nodeCount()` that recursively counts nodes, then compare it for 200 words sharing the prefix `prefix` versus 200 words with random 5-letter names. Expected: far fewer nodes in the shared case — you are measuring the compression that sharing buys, and the memory half of the trie's bargain.
