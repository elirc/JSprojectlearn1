# 📘 Learning Guide: Markov Chain Sentence Generator

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A program that *learns* from a piece of text which word tends to follow which, then invents new sentences by wandering through those patterns.

Feed it: `"the cat sat on the mat the cat ate the fish"`.
It notices: after `"the"` comes `cat`, `mat`, `cat`, or `fish`; after `"cat"` comes `sat` or `ate`; and so on.
Then it generates by starting at some word and repeatedly asking, "what could come next?", picking randomly:

```
the cat ate the mat the cat sat on the fish
the fish
```

The output is nonsense, but *plausible-sounding* nonsense — every pair of neighboring words really did appear next to each other in the source. This trick (in a vastly scaled-up form) is an ancestor of how modern text-prediction works.

## 2. Concepts you need first

### What is a Markov chain?
A **Markov chain** is a system that moves from state to state, where the next step depends *only on where you are now*, not how you got there. Here, each state is a word: standing on `"the"`, the next word is drawn from the words that followed `"the"` in the source. No memory of anything earlier. That forgetfulness is the whole definition.

### Splitting text into words
`.split()` chops a string into an array. Splitting on the **regular expression** (text pattern) `/\s+/` means "split on any run of whitespace" — spaces, tabs (`\t`), and newlines (`\n`) alike:

```js
console.log("a  b\nc".split(" "));    // ["a", "", "b\nc"]  — broken!
console.log("a  b\nc".split(/\s+/));  // ["a", "b", "c"]    — correct
```

`.filter(Boolean)` then removes any empty strings (`""` is **falsy** — treated as false — so `Boolean("")` is `false` and `filter` drops it).

### Objects vs. `Map`
Both store key → value pairs. A plain **object** is fine for fixed, known keys. A **`Map`** is built for keys that come from *data* (like arbitrary words), with a clean toolkit:

```js
const m = new Map();
m.set("cat", ["sat"]);          // store
console.log(m.has("cat"));      // true
console.log(m.get("cat"));      // ["sat"]
console.log(m.get("dog"));      // undefined (missing key)
console.log(m.size);            // 1
console.log([...m.keys()]);     // ["cat"]  (spread the keys into an array)
```

Why prefer `Map` here? Objects come with surprise built-in keys (try `({})["constructor"]` — it's not `undefined`!). If your source text contained the word "constructor", a plain object could misbehave. A `Map` starts truly empty.

### Building a "followers" table
The core data structure: for each word, an array of every word that ever followed it — **including duplicates**:

```js
// from "the cat sat the cat ran":
// "the" → ["cat", "cat"]     "cat" → ["sat", "ran"]
```

Duplicates matter: picking uniformly at random from `["cat", "cat", "dog"]` gives `cat` a 2-in-3 chance — the repeats *are* the probabilities, for free.

### Random picking and the `rng` trick
`Math.random()` gives a random decimal from 0 up to (not including) 1; `Math.floor` chops the decimals; together they pick a random array element:

```js
const arr = ["a", "b", "c"];
console.log(arr[Math.floor(Math.random() * arr.length)]); // random element
```

Randomness makes exact testing impossible — unless the random function is a **parameter** you can replace. Passing tools in from outside is **dependency injection**; a fake like `() => 0` makes the code pick element 0 every time, so tests get predictable output. (`rng` = random number generator.)

### Options objects and destructuring with defaults
Instead of many positional parameters, take one object of named settings. **Destructuring** unpacks it, `=` gives defaults, and the trailing `= {}` allows calling with no options at all:

```js
function demo({ maxWords = 20, start } = {}) {
  console.log(maxWords, start);
}
demo();                  // 20 undefined
demo({ start: "cat" });  // 20 "cat"
```

### The `??` operator (nullish coalescing)
`a ?? b` means "use `a`, unless it's `null` or `undefined` — then use `b`". It's a clean "fall back to a default" tool:

```js
console.log("cat" ?? "dog");    // "cat"
console.log(undefined ?? "dog"); // "dog"
```

### `while` loops and `break`
A **`while` loop** repeats as long as its condition holds; **`break`** exits a loop early:

```js
let n = 1;
while (n < 30) {
  n = n * 2;
  if (n === 16) break;
}
console.log(n); // 16
```

### `join`
Glues an array into one string with a separator: `["a","b"].join(" ")` → `"a b"`.

### Modules and tests
`export` marks what a file shares; `import` pulls it into another file. Tests use Node's built-in runner (`node --test`): `assert.equal(a, b)` checks primitive equality, `assert.deepEqual(a, b)` checks arrays/objects have equal *contents*, `assert.ok(x, msg)` checks `x` is truthy.

### Build phase vs. use phase
Big idea of this project: some work is expensive and should happen **once** (reading all the text, building the table); some is cheap and happens **many times** (generating a sentence). Splitting them, with a piece of data handed between, is the shape of compilers (compile once, run often), search engines (index once, search often), and machine learning (train once, predict often).

## 3. Walking through the original code

```js
function makeSentence(text, howMany) {
  // build the chain AND generate, all in one function
  var words = text.split(" ");
```

One function, two jobs — the comment admits it. The text is split on single spaces only.

```js
  var chain = {};
  for (var i = 0; i < words.length - 1; i++) {
    if (chain[words[i]] == undefined) {
      chain[words[i]] = [];
    }
    chain[words[i]].push(words[i + 1]);
  }
```

The build phase. For each word (except the last — note the `- 1`, since the last word has nothing after it), make sure it has an array in `chain`, then push the *next* word onto that array. After this, `chain["the"]` is the list of every word that ever followed `"the"`, repeats included.

```js
  var word = words[0];
  var sentence = word;
```

The generate phase starts — always — at `words[0]`, the very first word of the source text.

```js
  for (var j = 0; j < howMany; j++) {
    var followers = chain[word];
    if (followers == undefined) {
      break;
    }
    word = followers[Math.floor(Math.random() * followers.length)];
    sentence = sentence + " " + word;
  }
  return sentence;
```

Up to `howMany` times: look up the current word's followers; if there are none (we landed on the source's final word — a dead end), stop early. Otherwise pick a random follower, make it the new current word, and glue it onto the sentence string.

```js
var text = "the cat sat on the mat ...";
console.log(makeSentence(text, 10));
console.log(makeSentence(text, 10));
```

Two calls — and the *entire* chain gets rebuilt from scratch inside each one.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: Two jobs at two different rhythms, welded together.** Building the chain reads the *whole text*; generating just hops through a table. Story: you download a free e-book (a few hundred thousand words) and want 1,000 fun sentences. With the original, every single sentence re-reads and re-tables the entire novel — 1,000 novel-parses to do 1,000 cheap walks. Your laptop fan spins up for what should be instant. The expensive work should run once, its result kept and reused.

**Flaw 2: Every sentence starts with the same word.** `var word = words[0]` hard-codes the start. With the sample text, every sentence begins `"the ..."`. Want variety, or to start from `"fish"`? You'd have to edit the function's body — there's no knob to turn. A function you must *edit* to *use differently* is a design smell.

**Flaw 3: Fragile splitting.** `split(" ")` only splits on single spaces. Real text has double spaces and newlines. A double space creates an empty-string "word" `""` that gets its own entry in the chain; a newline glues two words into one fake word like `"mat\nthe"`. Your generated sentences would occasionally contain invisible hiccups or fused words, and you'd have no idea why.

**Flaw 4: Untestable randomness.** `Math.random()` is baked in. You cannot write a test saying "given this text, expect exactly this sentence," because the output differs every run. Combined with Flaw 1, you can't even test the build phase alone — it's trapped inside the same function as the random walk.

## 5. Try it yourself first!

Try refactoring before reading on. Hints, vaguest first:

1. The comment in the original ("build the chain AND generate") is naming its own problem. What's the most natural way to split one function into two?
2. If building and generating are separate functions, what do they hand between them? What should `buildChain(text)` *return*, and what should `generateSentence` *accept*?
3. For the always-same-start problem: where could the starting word come from if the caller doesn't supply one? (You have all the chain's keys available…)
4. For messy text: revisit `/\s+/` and `.filter(Boolean)` from section 2. For testability: revisit the `rng` parameter trick.
5. Concretely: `buildChain(text)` returns a `Map` of word → followers array. `generateSentence(chain, { maxWords = 20, start, rng = Math.random } = {})` starts at `start ??` a random key, then loops: get followers, `break` if none, pick one randomly, push it. `join(' ')` at the end.

## 6. Understanding the refactored solution

```js
export function buildChain(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chain = new Map();
  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];
    if (!chain.has(current)) {
      chain.set(current, []);
    }
    chain.get(current).push(next);
  }
  return chain;
}
```

The build phase is now its own function. Robust splitting (any whitespace, no empty words), a true `Map` instead of a plain object, and — crucially — it **returns the chain as data**. That returned `Map` is the *interface* between the phases: build once, hand the Map around, generate forever. Either side can later be upgraded (smarter model, fancier generation) as long as the Map's shape stays "word → array of followers." And the duplicates in those arrays quietly encode the probabilities: `'the' → ['cat','cat','fish']` makes `cat` twice as likely as `fish` with zero extra machinery.

```js
export function generateSentence(chain, {
  maxWords = 20,
  start,
  rng = Math.random,
} = {}) {
  if (chain.size === 0) return '';
  const pickFrom = (array) => array[Math.floor(rng() * array.length)];
```

The use phase takes the chain plus an options object — the caller names what they want (`maxWords`, `start`) and everything has a default. `rng` is injectable for tests. An empty chain (built from empty text) politely returns `''` instead of crashing. `pickFrom` is the random-element helper, written once.

```js
  let word = start ?? pickFrom([...chain.keys()]);
  const sentence = [word];
```

The fix for "always starts with `the`": if the caller gave a `start`, use it; otherwise (`??`) pick a random key from the chain. Also notice the sentence is collected in an **array** and `join`ed at the end — cleaner than repeated string gluing.

```js
  while (sentence.length < maxWords) {
    const followers = chain.get(word);
    if (!followers) break; // dead end: last word of the source text
    word = pickFrom(followers);
    sentence.push(word);
  }
  return sentence.join(' ');
```

The random walk: look up followers; a dead end (`undefined` from `chain.get`, which is falsy) ends the sentence gracefully; otherwise hop to a random follower.

**The CLI** (`cli.js`) shows the payoff in four lines: build the chain **once**, then a loop generates five sentences from the same chain — no re-parsing.

**The tests** are worth studying one by one:
- *Build correctness*: `assert.deepEqual(chain.get('the'), ['cat', 'cat'])` — checks contents of the array, duplicates and all, and that the last word maps to `undefined`.
- *Messy whitespace*: feeds `'a  b\nc\t d'` and confirms no empty words snuck in.
- *Determinism*: with `rng: () => 0`, "random" always picks the first option, so the exact output `'a b a'` can be asserted. That's dependency injection paying off.
- *The invariant test* (the clever one): you can't predict random output, but you can verify the **property that defines a Markov chain** — every adjacent pair in the output must have appeared in the source. The test loops over the generated words and asserts each pair exists in the chain. Testing a *property* instead of an exact value is how you test randomness honestly.
- *Dead end* and *empty text*: graceful stops, not crashes.

## 7. Words you learned (glossary)

- **Markov chain**: a step-by-step process where the next state depends only on the current one.
- **State**: the "where you are now" of a process — here, the current word.
- **Followers table**: the map from each word to every word that followed it (repeats kept).
- **Regular expression (regex)**: a text pattern; `/\s+/` = one or more whitespace characters.
- **Falsy / truthy**: how values behave in an `if`; `""` and `undefined` are falsy.
- **`Map`**: a key → value store with `set`/`get`/`has`/`size`/`keys`, safe for arbitrary keys.
- **Spread (`...`)**: unpacks items, e.g. `[...chain.keys()]` makes an array of keys.
- **Options object**: one object argument of named settings with defaults.
- **Destructuring**: unpacking an object into variables right in the parameter list.
- **`??` (nullish coalescing)**: "use the left side unless it's `null`/`undefined`."
- **`while` / `break`**: repeat while a condition holds / exit a loop early.
- **Dead end**: a word with no recorded followers (the source's last word).
- **Dependency injection / `rng`**: passing the random function in as a parameter so tests can control it.
- **Deterministic**: same inputs → same output, every time.
- **Invariant / property**: a rule that must always hold, testable even when exact output isn't predictable.
- **Build phase / use phase**: expensive one-time model construction vs. cheap repeated querying.
- **Interface**: the agreed shape of data (here, the Map) that connects two pieces of code.
- **CLI**: command-line interface — a small script you run in a terminal.

## 8. Experiments to try on the plane (no internet needed)

1. **Bias an outcome**: in `refactored/cli.js`, append `' the cat the cat the cat'` to the text, rebuild, and generate a few sentences. Expected: `cat` shows up after `the` far more often — you fattened `'the'`'s follower list with duplicates, and duplicates are probabilities.
2. **Force a start**: change the CLI's call to `generateSentence(chain, { maxWords: 12, start: 'fish' })`. Expected: every sentence begins with `fish`. Then try `start: 'zebra'` (not in the text) — predict first! (Expected: just `"zebra"` — no followers means immediate dead end, thanks to the `if (!followers) break`.)
3. **Trace determinism by hand**: with the chain from `'a b a c'` and `rng: () => 0`, walk the code on paper starting at `'a'` with `maxWords: 5`. (Chain: `a → [b, c]`, `b → [a]`. Always picking index 0: `a, b, a, b, a`. The test's `maxWords: 3` gave `'a b a'` — check yours agrees for the first three.)
4. **Break the invariant test on purpose**: in `markov.js`, change `word = pickFrom(followers)` to `word = pickFrom([...chain.keys()])` (hop to *any* word, ignoring followers). Run the tests mentally: which one fails? (Expected: "every adjacent pair existed in the source" — the output is no longer a Markov chain. Change it back!)
5. **Order-2 teaser (hard)**: today's state is one word. Sketch on paper what `buildChain` would store if a state were *two* consecutive words (key `"the cat"` → words that followed that pair). Would `generateSentence` need to change too? (Yes — it must track the last two words and build the next lookup key. This is exactly the extension the Map-as-interface design makes possible, and larger contexts make output eerily more coherent.)
