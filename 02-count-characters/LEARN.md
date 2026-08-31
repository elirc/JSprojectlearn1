# 📘 Learning Guide: Count Characters

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A function that takes a piece of text and reports how many times each character appears. Give it `"hello world"` and it answers something like:

```
h → 1
e → 1
l → 3
o → 2
(space) → 1
w → 1
r → 1
d → 1
```

That's the whole job: text in, a tally of characters out. It sounds easy — and the original version *does* work for `"hello world"`. This project is about the inputs you *didn't* try: emoji, weird key names, and wrong types. It's a lesson in hunting edge cases on purpose.

## 2. Concepts you need first

### Objects as key→value stores
An **object** in JavaScript is a collection of named values — pairs of a **key** (the name) and a **value**:

```js
const ages = {};        // empty object
ages["sam"] = 30;       // add a key "sam" with value 30
ages["sam"] = ages["sam"] + 1;
console.log(ages);      // { sam: 31 }
console.log(ages["zoe"]); // undefined — key doesn't exist
```

Reading a key that isn't there gives `undefined` (JavaScript's "nothing here" value). Objects are the traditional way to build a tally: use each character as a key, store its count as the value.

### Prototypes and inherited keys (the object trap)
Every plain object secretly *inherits* some built-in keys from JavaScript itself — things like `constructor` and `toString`, via a hidden link called the **prototype**. You never put them there, but lookups find them:

```js
const tally = {};
console.log(tally["constructor"]); // a function! not undefined!
console.log(tally["__proto__"]);   // an object! not undefined!
```

If your keys come from user input, a user typing `constructor` gets a nonsense answer instead of `undefined`. `__proto__` is even worse — assigning to it can rewire the object's hidden link. This is why plain objects make risky dictionaries.

### `Map` — a real dictionary
A **Map** is a built-in type made *specifically* for key→value storage, with zero inherited baggage:

```js
const m = new Map();
m.set("a", 1);            // store
console.log(m.get("a"));  // 1 — read
console.log(m.get("z"));  // undefined — truly absent
console.log(m.size);      // 1 — count of entries, for free
```

`m.get("constructor")` is honestly `undefined`. Maps also remember insertion order and can use *any* value as a key.

### How strings really store characters (UTF-16 and surrogate pairs)
JavaScript strings are stored as a sequence of 16-bit units — a format called **UTF-16**. Most characters fit in one unit, but emoji and many other symbols need *two* units, called a **surrogate pair**:

```js
console.log("a".length);  // 1
console.log("💩".length); // 2  (two units — but ONE character!)
console.log("💩"[0]);     // '\ud83d' — half an emoji, meaningless alone
```

So indexing with `str[i]` can hand you broken halves. The full "one real character" unit is called a **code point**.

### `for...of` — looping over real characters
A `for...of` loop walks a string by code points, keeping emoji whole:

```js
for (const ch of "a💩") {
  console.log(ch);
}
// prints: a
// prints: 💩   (whole!)
```

Compare with `for (let i = 0; ...)` + `str[i]`, which would print `a` then two broken halves.

### `??` — the nullish coalescing operator
`a ?? b` means "use `a`, unless it is `null` or `undefined` — then use `b`":

```js
console.log(5 ?? 0);         // 5
console.log(undefined ?? 0); // 0
```

Perfect for tallies: `counts.get(key) ?? 0` reads "the current count, or 0 if we haven't seen this key yet." One expression replaces a whole if/else.

### Throwing errors and `TypeError`
`throw` stops the function immediately and raises an **error** that the caller must deal with. `TypeError` is the standard error class for "you gave me the wrong type":

```js
function shout(text) {
  if (typeof text !== 'string') throw new TypeError('need a string');
  return text.toUpperCase();
}
shout(42); // 💥 TypeError: need a string — loud and immediate
```

`typeof x` returns a string naming the type: `"string"`, `"number"`, `"boolean"`, etc. Failing loudly at the door beats returning a wrong-but-plausible answer.

### Default parameters and options objects
A **default parameter** kicks in when the caller doesn't supply a value. An **options object** is the pattern of passing named settings as one object. **Destructuring** unpacks it:

```js
function greet(name, { loud = false } = {}) {
  return loud ? `HI ${name}!` : `hi ${name}`;
}
console.log(greet("Sam"));                 // "hi Sam"
console.log(greet("Sam", { loud: true })); // "HI Sam!"
```

The `{ loud = false } = {}` part means: "expect an object; pull out `loud`, defaulting to `false`; and if no object at all was passed, pretend it was `{}`." Why bother? Because `greet("Sam", true)` tells a reader nothing — true *what?* — while `{ loud: true }` documents itself.

### Spread (`...`), `entries`, and `sort`
Three small tools used in the refactor's helper:

```js
const m = new Map([['a', 2], ['b', 5]]);
const pairs = [...m.entries()];  // [['a',2], ['b',5]] — Map → array of [key,value]
pairs.sort((x, y) => y[1] - x[1]);
console.log(pairs);              // [['b',5], ['a',2]] — biggest count first
```

`...` (**spread**) pours the Map's entries into a real array. `sort` takes a **comparator** function: it gets two items and returns a negative number if the first should come first, positive if the second should. `y[1] - x[1]` sorts by the count (index 1 of each pair), descending.

### Modules and tests (quick version)
`export` marks what a file shares; `import` pulls it into another file. A **test** is code that checks code: `assert.equal(a, b)` throws if the two differ, `assert.throws(fn, TypeError)` passes only if calling `fn` throws that error class. Run all tests with `node --test`. (Project 01's guide covers this in depth.)

## 3. Walking through the original code

```js
function countChars(str) {
  var counts = {};
```

Start with an empty plain object as the tally. (`var` is the old, leaky variable keyword — `const` is preferred now.)

```js
  for (var i = 0; i < str.length; i++) {
    var c = str[i];
```

Walk the string one *index* at a time and grab `str[i]` — one 16-bit unit, which as you now know is sometimes only *half* a character.

```js
    if (counts[c] == undefined) {
      counts[c] = 1;
    } else {
      counts[c] = counts[c] + 1;
    }
```

The tally dance: never seen this character? Start it at 1. Seen it? Add 1. (Note `==`, the loose comparison — `===` is the safe habit.)

```js
  return counts;
}
console.log(countChars("hello world"));
```

Return the object and print a demo. So far, it *looks* fine. Then the file demonstrates its own bugs:

```js
console.log(countChars("💩💩")); // { '\ud83d': 2, '\udca9': 2 }  ...what?
```

Two poop emoji come back as *four* half-characters, tallied as two counts of two broken pieces.

```js
var weird = countChars("x");
weird["__proto__"]; // objects come with baggage you didn't put there
```

And the returned object answers questions about keys you never added.

## 4. What's wrong with it (in beginner terms)

**1. `str[i]` breaks emoji.** The loop counts 16-bit units, not characters. Story: you build a "letter frequency" feature for a chat app. It works all week in testing. Launch day, someone posts "🎉🎉🎉" and your stats page shows gibberish like `'\ud83c': 3`. Nobody typed that. The bug was there all along — you just never fed it an emoji. Edge cases don't announce themselves; you have to hunt them.

**2. Plain objects have inherited baggage.** Ask the tally about `"constructor"` and instead of `undefined` you get a function. Story: you add a feature — "show the count for a character the user types in a box." A curious user types `__proto__`. Your code does `counts[userInput]`, gets a strange object, tries to add 1 to it, and displays `[object Object]1`. Worse, code that *assigns* to `counts["__proto__"]` can corrupt the object itself. A `Map` has none of these trapdoors.

**3. No input validation.** Call `countChars(42)` and you get `{}` back — silently. An empty object looks like a perfectly legitimate answer ("no characters found"). Story: a teammate's code accidentally passes a number instead of a string. Nothing crashes. Three functions later, a report renders empty and someone spends an afternoon tracing *backwards* to find where the data went wrong. If the function had thrown a `TypeError` at the door, the very first run would have pointed at the exact line.

## 5. Try it yourself first!

Try fixing the original before reading on. Hints, vaguest first:

1. 🌱 There's a loop style that walks *real characters* instead of indexes. And there's a container type built for dictionaries. Swap both in.
2. 🌿 Use `for (const char of text)` for the walk, and `new Map()` for the tally. You'll need `.get(key)` and `.set(key, value)` instead of square brackets.
3. 🌳 The "first time vs. seen before" if/else can shrink to one line. What does `counts.get(char)` return for an unseen key, and which operator turns that into a 0?
4. 🍎 Add a guard at the top: `if (typeof text !== 'string') throw new TypeError(...)`. Then the full tally line: `counts.set(key, (counts.get(key) ?? 0) + 1);`.

## 6. Understanding the refactored solution

**`count-characters.js`** — the whole fix in one pure function:

```js
export function countCharacters(text, { ignoreCase = false } = {}) {
  if (typeof text !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof text}`);
  }
```

First line of the body: bounce bad input *immediately*, with a message that says what arrived. The backtick string is a **template literal** — `${...}` splices a value into text.

```js
  const counts = new Map();
  for (const char of text) {
    const key = ignoreCase ? char.toLowerCase() : char;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
```

Three fixes in four lines: a `Map` (no inherited keys), `for...of` (whole emoji), and `?? 0` (the tally if/else collapsed to one expression). The optional `ignoreCase` setting folds `A` and `a` into one key when requested — passed as a named option, so call sites read as `countCharacters(s, { ignoreCase: true })`, never a mystery `true`.

```js
export function sortedByCount(counts) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
```

A small display helper: spread the Map into an array of `[character, count]` pairs, then sort by count descending. Kept as a *separate* function — counting and presenting are different jobs.

**`count-characters.test.js`** — each test pins down one behavior. The two most interesting:

```js
test('emoji count as one character, not two surrogate halves', () => {
  const counts = countCharacters('💩💩');
  assert.equal(counts.get('💩'), 2);
  assert.equal(counts.size, 1);
});
```

This is the emoji bug, preserved forever as a tripwire. If anyone ever swaps the loop back to `str[i]`, this test turns red before the code ships.

```js
test('non-strings are rejected loudly, not silently', () => {
  assert.throws(() => countCharacters(42), TypeError);
});
```

`assert.throws` passes only if the call *does* throw a `TypeError` — testing that the guard works. Note the wrapper arrow function: we hand `assert.throws` something it can call itself, rather than exploding before the assertion runs. The other tests cover empty input, the `__proto__` key behaving like any normal key, case folding, and the sort helper — the full edge-case checklist, written down as executable proof.

## 7. Words you learned (glossary)

- **Object** — a collection of key→value pairs; JavaScript's general-purpose container.
- **Key / value** — the name you store under, and the thing stored.
- **`undefined`** — JavaScript's "nothing here" value.
- **Prototype** — the hidden link every plain object has to built-in shared keys.
- **Inherited key** — a key like `constructor` that lookups find even though you never set it.
- **`__proto__`** — a special trapdoor key that can rewire an object's prototype.
- **Map** — a built-in dictionary type: `set`/`get`/`size`, no inherited baggage, ordered keys.
- **UTF-16** — the 16-bit-unit format JavaScript uses to store strings.
- **Surrogate pair** — two UTF-16 units that together encode one character (most emoji).
- **Code point** — one real character as a unit; what `for...of` iterates.
- **`for...of`** — a loop over the *values* of a sequence (whole characters for strings).
- **`??` (nullish coalescing)** — "left side, unless it's null/undefined — then right side."
- **`throw`** — stop now and raise an error.
- **`TypeError`** — the standard error class for wrong-type input.
- **`typeof`** — operator returning a type name as a string.
- **Validation** — checking input is acceptable before working with it.
- **Options object** — named settings passed as one object: `{ ignoreCase: true }`.
- **Default parameter** — the fallback value used when the caller omits an argument.
- **Destructuring** — unpacking values out of an object/array in the parameter list or a declaration.
- **Template literal** — backtick string with `${...}` splicing.
- **Spread (`...`)** — pours a collection's items out into an array or call.
- **Comparator** — the function `sort` uses to decide ordering.
- **Pure function** — same input → same output, no side effects.
- **`assert.throws`** — test helper that passes only if the code throws the expected error.

## 8. Experiments to try on the plane (no internet needed)

Run tests with `node --test 02-count-characters/` after each change.

1. **See the broken halves yourself.** Run `node 02-count-characters/original.js` and look at the `"💩💩"` line. Then in a scratch file, try `console.log("💩".length)` and `console.log([..."💩"].length)`. Expected: `2` and `1` — spread uses code points, just like `for...of`.
2. **Interrogate a plain object.** In a scratch file: `const o = {}; console.log(o["constructor"], o["toString"]);` Expected: two functions print — baggage you never packed. Then `const m = new Map(); console.log(m.get("constructor"));` → `undefined`. That's the whole Map argument in two lines.
3. **Break the guard.** In `count-characters.js`, delete the `typeof` check and run the tests. Expected: the "rejected loudly" test fails — but notice *how*: `countCharacters(42)` now throws a different, confusing error, because `for...of` can't loop a number. The guard's job was a *clear* error, early.
4. **Add a new option.** Add `ignoreSpaces = false` next to `ignoreCase`, and inside the loop: `if (ignoreSpaces && char === ' ') continue;` (`continue` skips to the next loop turn). Expected: `countCharacters('a a', { ignoreSpaces: true }).size` is `1`. Write a test for it.
5. **Sort ties alphabetically.** Change `sortedByCount`'s comparator so equal counts sort by character: `b[1] - a[1] || (a[0] < b[0] ? -1 : 1)`. Expected: `countCharacters('ba')` sorted gives `[['a',1],['b',1]]` instead of insertion order. (`||` falls through to the second rule only when the first gives 0 — a tie.)
