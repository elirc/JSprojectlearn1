# 📘 Learning Guide: Array Utilities

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A small toolbox of five helper functions for working with lists (arrays), built around a game leaderboard:

- `unique(items)` — remove duplicates: `unique(["ana","bo","ana"])` → `["ana","bo"]`
- `sortBy(items, keyOf)` — sort without the classic traps: `sortBy([100,9,80], n => n)` → `[9,80,100]`
- `groupBy(items, keyOf)` — bucket items: players grouped by team
- `countBy(items, keyOf)` — count items per bucket
- `chunk(items, size)` — split into pages: `chunk([1,2,3,4,5], 2)` → `[[1,2],[3,4],[5]]`

Running `node original.js` shows the flawed versions printing wrong or surprising results, with comments pointing at the bugs.

## 2. Concepts you need first

### Arrays and their built-in methods

An **array** is an ordered list: `[100, 9, 80]`. Arrays come with built-in **methods** (functions attached to a value, called with a dot):

```js
const nums = [1, 2, 3];
console.log(nums.slice(0, 2)); // [1, 2]   (copy a piece; original untouched)
nums.push(4);                  // add to the end (changes the array!)
console.log(nums);             // [1, 2, 3, 4]
```

### Mutation — changing a thing vs making a new one

To **mutate** means to change data in place. Some methods mutate (`push`, `sort`, `reverse`); others return a fresh copy (`slice`, `map`). This matters because of references: if two parts of your program share one array, a mutation in one place is visible everywhere.

```js
const shared = [3, 1, 2];
const alias = shared;    // same array, second name
alias.sort();
console.log(shared);     // [1, 2, 3] — changed, even though we "only" touched alias
```

A **side effect** is anything a function does beyond returning a value — like mutating its input. Side effects that callers don't expect cause "spooky" bugs.

### The `.sort()` double trap

Trap one: with no instructions, `.sort()` converts everything to **strings** and sorts alphabetically. Alphabetically, `"9"` comes after `"80"` because `"9"` > `"8"` as characters:

```js
console.log([100, 9, 80, 12].sort()); // [100, 12, 80, 9]  (!!)
```

Trap two: `.sort()` also mutates the array you called it on (see above). Two traps, one method.

### Comparators — teaching sort how to compare

A **comparator** is a function you hand to `.sort()` that takes two items and returns: a negative number ("a goes first"), a positive number ("b goes first"), or zero ("tie").

```js
const nums = [100, 9, 80];
nums.sort((a, b) => a - b);   // numeric ascending
console.log(nums);            // [9, 80, 100]
```

Careful: the popular `a - b` habit only works for normal-sized numbers. It breaks on strings (`"b" - "a"` is `NaN`) and can break on gigantic numbers. Comparing with `<` and `>` instead always works.

### Higher-order functions and `keyOf` functions

A **higher-order function** is a function that takes another function as input (or returns one). You've already used one: `.map`.

```js
const players = [{ name: "ana", score: 80 }, { name: "bo", score: 12 }];
console.log(players.map(p => p.name)); // ["ana", "bo"]
```

The little arrow function `p => p.name` is a **key extractor** (this project calls it `keyOf`): given an item, it returns the value you care about. Passing `keyOf` in means one `sortBy` can sort players by score today and log lines by timestamp tomorrow — the caller decides *how to measure*, the utility handles the rest.

### Arrow functions

`(a, b) => a + b` is a short way to write a function. One parameter needs no parentheses: `n => n * 2`. If the body is a single expression, it's returned automatically.

### `Set` — a collection with no duplicates

A **Set** stores values and automatically ignores repeats. Spreading it (`...`) back into `[]` turns it into an array again, keeping first-seen order:

```js
const s = new Set(["ana", "bo", "ana"]);
console.log(s.size);      // 2
console.log([...s]);      // ["ana", "bo"]
```

The `...` is the **spread operator**: it "pours" a collection's items out into a new array. `[...items]` is also the standard one-line way to *copy* an array.

### `Map` — a safer dictionary than plain objects

A **Map** stores key → value pairs, like an object, but keys can be anything and there are no surprise built-in keys. Plain objects secretly inherit properties like `constructor` and `__proto__`, so `teams["constructor"]` on an empty object is *not* undefined — it's a built-in function! A Map has none of that baggage.

```js
const m = new Map();
m.set("red", ["ana"]);
console.log(m.get("red"));          // ["ana"]
console.log(m.has("constructor"));  // false — no surprises
```

### Big-O: O(n) vs O(n²)

**Big-O** notation describes how work grows with input size `n`. **O(n)** means "look at each item once" — 1,000 items ≈ 1,000 steps. **O(n²)** means "for each item, scan all the others" — 1,000 items ≈ 1,000,000 steps. A nested loop over the same data is the classic O(n²) shape.

### `??`, default parameters, and destructured options

- `x ?? 0` means "use `x`, unless it's `null`/`undefined`, then use `0`" (the **nullish coalescing** operator).
- `function f(a, { descending = false } = {})` means: the second argument is an options object; if the caller omits it entirely, use `{}`; if it lacks `descending`, default that to `false`.

### Throwing errors

`throw new RangeError("message")` stops the function immediately with an error. A `RangeError` is a built-in error type meaning "a number was outside the allowed range". Failing *loudly* at the bad call site beats failing mysteriously later.

## 3. Walking through the original code

**`uniqueNames`** — dedupe by hand:

```js
for (var i = 0; i < names.length; i++) {
  var found = false;
  for (var j = 0; j < result.length; j++) {  // O(n²) scan per item
    if (result[j] == names[i]) found = true;
  }
  if (!found) result.push(names[i]);
}
```

For each name, scan everything we've kept so far; only push it if we didn't find it. Correct, but that inner loop makes it O(n²) — slow on big lists. (Also note `==`, the loose comparison that converts types before comparing; `===` is the safe habit.)

**`topScores`** — the two-bug line:

```js
scores.sort();          // TWO bugs in one line
scores.reverse();
return scores.slice(0, 3);
```

`sort()` with no comparator sorts numbers alphabetically, *and* both `sort()` and `reverse()` mutate `scores` — the caller's array — in place. Then `slice(0, 3)` takes the first three of the (wrongly ordered) list.

**`groupByTeam`** — buckets in a plain object:

```js
var teams = {};
...
if (teams[players[i].team] == undefined) {
  teams[players[i].team] = [];
}
teams[players[i].team].push(players[i]);
```

For each player, make sure a bucket array exists for their team, then push them in. Works — until a team is literally named `"constructor"`: `teams["constructor"]` is already a built-in function inherited by every plain object, so the `== undefined` check says "bucket exists!" and `.push` explodes.

The demo lines at the bottom show it all: `topScores([100, 9, 80, 12])` prints `[9, 80, 12]`, and afterwards the caller's `scores` array is permanently reordered.

## 4. What's wrong with it (in beginner terms)

**Alphabetical number sorting.** Story: your leaderboard shows the top 3 as 9, 80, 12. A player who scored 100 is missing entirely, and the player who scored 9 is "winning". Nobody gets an error message — the app just quietly ranks things wrong. This is arguably the single most-hit trap in JavaScript.

**Mutating the caller's array.** Story: `scores` is your saved game history, ordered by *when each game happened*. You call `topScores(scores)` once, to display a widget. From that moment on, the history is reordered — and next week, the "recent games" screen shows games in a nonsense order. The bug surfaces far away from the line that caused it, which makes it miserable to find. A function's signature (`topScores(scores)`) never admitted it would edit your data.

**O(n²) dedupe.** Fine for 4 names. With 10,000 log lines (project 36 uses these utilities!), that's ~100,000,000 comparisons instead of ~10,000 operations. Programs "randomly get slow" this way.

**Plain-object buckets.** Story: a user names their team `constructor` (or a malicious one names it `__proto__`). Your grouping code crashes or, worse, silently corrupts every object in the program. Data you don't control should never become plain-object keys.

**`chunk` with size 0** (in the refactor's world): `start += 0` never advances, so the loop runs forever and the page freezes. That's why the refactor rejects bad sizes with a thrown error.

## 5. Try it yourself first!

Try fixing `original.js` yourself (in a scratch copy). Hints, vague → specific:

1. Can `Set` and `Map` replace the manual loop and the plain object?
2. For sorting: fix both traps at once — pass a comparator, *and* don't sort the caller's array.
3. Copy an array in one expression with spread: `[...scores]`.
4. Write the comparator with `<` / `>` instead of subtraction, so it works on strings too.
5. Make your functions general: instead of hardcoding `.team` or sorting raw numbers, accept a function argument like `p => p.team` and call it inside.
6. For `chunk`: a loop that jumps `start += size` and pushes `items.slice(start, start + size)` each round. Guard against `size < 1` first.

## 6. Understanding the refactored solution

The file header declares two "house rules": never mutate inputs, and take `keyOf` functions instead of hardcoded property names. Every function follows both.

**`unique`** — one line:

```js
return [...new Set(items)];
```

The Set eats duplicates in a single pass (O(n)); the spread pours it back into an array, first-seen order preserved.

**`sortBy`**:

```js
export function sortBy(items, keyOf, { descending = false } = {}) {
  const order = descending ? -1 : 1;
  return [...items].sort((a, b) => {
    const keyA = keyOf(a);
    const keyB = keyOf(b);
    if (keyA < keyB) return -order;
    if (keyA > keyB) return order;
    return 0;
  });
}
```

`[...items]` copies first, so `.sort()` mutates only the copy — house rule 1 kept. The comparator extracts keys with the caller's `keyOf` and compares with `<`/`>` — numbers sort numerically, strings alphabetically, no subtraction hazards. The `order` variable of `1` or `-1` flips the answers for descending sorts. (Newer JavaScript has `toSorted()`, which is exactly "copy then sort" built in.)

**`groupBy`** — buckets in a `Map`:

```js
const key = keyOf(item);
if (!groups.has(key)) groups.set(key, []);
groups.get(key).push(item);
```

Same idea as the original, but `Map.has` genuinely answers "did *we* put this key here?", so `"constructor"` is a perfectly fine team name.

**`countBy`** — the same loop, but stores a number instead of an array: `counts.set(key, (counts.get(key) ?? 0) + 1)`. The `?? 0` handles the very first time a key is seen.

**`chunk`** — validates loudly, then slices:

```js
if (!Number.isInteger(size) || size < 1) {
  throw new RangeError(`chunk size must be a positive integer, got ${size}`);
}
```

`Number.isInteger` rejects `1.5`, `"2"`, `NaN`; `size < 1` rejects the infinite-loop case `0`. Then a simple loop pushes slices; the final slice is naturally short because `slice` stops at the end of the array.

**The tests** pin down each fix by name: numbers sort numerically; `sortBy` does NOT mutate (it sorts, then asserts the input still equals its original order — a test for a *non*-effect!); grouping survives the hostile key `"constructor"`; `chunk` throws `RangeError` on `0` and `1.5` (`assert.throws(fn, RangeError)` passes only if calling `fn` throws that type). `assert.deepEqual` compares array *contents*, exactly the project-25 idea.

## 7. Words you learned (glossary)

- **Array**: an ordered list of values.
- **Method**: a function attached to a value, called with a dot (`arr.sort()`).
- **Mutation**: changing data in place instead of making a new copy.
- **Side effect**: anything a function does besides returning a value.
- **Comparator**: a function telling `.sort()` how to order two items (negative / zero / positive).
- **Higher-order function**: a function that takes or returns another function.
- **Key extractor / `keyOf`**: a function that pulls the value to measure out of an item.
- **Arrow function**: short function syntax, `x => x + 1`.
- **Spread operator (`...`)**: pours a collection's items into a new array; `[...a]` copies.
- **Set**: a collection that automatically ignores duplicate values.
- **Map**: a key→value collection with no inherited surprise keys.
- **Prototype / inherited property**: built-ins like `constructor` that plain objects carry invisibly.
- **Big-O / O(n) / O(n²)**: how work grows with input size — linear vs "for each, scan all".
- **Nullish coalescing (`??`)**: "use the left side unless it's `null`/`undefined`".
- **Options object**: a `{ ... }` argument holding named settings, with defaults.
- **`throw` / `RangeError`**: stop with an error; `RangeError` means a number was out of bounds.
- **`assert.throws`**: a test check that passes only if the code throws.

## 8. Experiments to try on the plane (no internet needed)

1. **Feel trap one.** In a scratch file: `console.log([25, 100, 3].sort())`. Expected: `[100, 25, 3]` — alphabetical order of `"1"`, `"2"`, `"3"`.
2. **Break house rule 1, watch the test object.** In `refactored/array-utils.js`, change `[...items].sort(...)` to `items.sort(...)` and run `node --test 26-array-utils/`. Expected: the "sortBy does NOT mutate" test fails.
3. **Sort strings with the "subtract" habit.** Try `["bo","ana"].sort((a, b) => a - b)` in a scratch file. Expected: order unchanged — `"bo" - "ana"` is `NaN`, which the sort treats as "tie". Then try `sortBy(["bo","ana"], s => s)` — correctly `["ana","bo"]`.
4. **Reuse `countBy` on new data.** Add a test: `countBy([{lvl:"warn"},{lvl:"error"},{lvl:"warn"}], x => x.lvl)` and assert `warn` is 2. Expected: passes — same function, brand-new shape of data, thanks to `keyOf`.
5. **Trigger the loud failure.** Add `assert.throws(() => chunk([1,2,3], -2), RangeError)` to the tests. Expected: passes. Then imagine the alternative: without the guard, `chunk([1], 0)` would loop forever.
