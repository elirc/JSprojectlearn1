# 📘 Learning Guide: Paginated API Client

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A client for an API that hands out a big list in chunks. There are 250 users, but each "request" returns only 25 at a time (a **page**), plus a marker telling you where the next chunk starts. Our task: "find the user named user42."

Run the original and it prints:

```
{ id: 42, name: 'user42' }
findUser42: ~110ms
```

Right answer — wasteful method. user42 lives on page 2, but the original downloads **all 10 pages** first, then searches. The refactor streams items one at a time and *stops fetching the moment it finds the answer*: 2 requests instead of 10, with no special optimization code.

## 2. Concepts you need first

### Pagination and cursors

Real APIs never return 100,000 items in one response — they **paginate**: each response has a batch of items plus a **cursor**, a bookmark saying "next batch starts here." You pass the cursor back to get the next page. `nextCursor: null` means "that was the last page."

```js
// One page looks like:
{ items: [ {id:1,...}, ... 25 of them ], nextCursor: 25 }
// The last page looks like:
{ items: [ ... ], nextCursor: null }
```

### Promises and async/await (quick recap)

A **Promise** is a value that arrives later. `await` pauses an `async` function until it arrives:

```js
const delayed = new Promise((r) => setTimeout(() => r("hi"), 10));
console.log(await delayed); // prints (after 10ms): hi
```

### Generators: functions that hand out values one at a time

A **generator** (`function*`) can pause at each `yield`, handing out one value per request instead of building a whole array:

```js
function* numbers() {
  yield 1;
  yield 2;
}
for (const n of numbers()) console.log(n); // prints: 1, then 2
```

`yield* someArray` yields each element of the array, one by one.

### Laziness (the superpower)

A generator is **lazy**: it does no work until someone asks for the next value, and if the consumer stops asking, the generator simply never runs the rest. Compare with an array-returning function, which is **eager** — it does *all* the work before returning anything:

```js
function* lazy() {
  console.log("making 1"); yield 1;
  console.log("making 2"); yield 2;
}
for (const n of lazy()) { console.log("got", n); break; }
// prints: making 1, got 1   — "making 2" NEVER runs
```

That `break` is the whole trick of this project: stop consuming, and the remaining work (including network requests!) never happens.

### Async generators and `for await`

Now combine the two superpowers. An **async generator** (`async function*`) can both `await` (fetch things) and `yield` (hand items out). You consume it with `for await...of`:

```js
async function* stream() {
  yield await Promise.resolve("a");
  yield await Promise.resolve("b");
}
for await (const x of stream()) console.log(x); // prints: a, then b
```

`for await` waits for each item as it becomes ready. `break` inside it stops the generator cold — no further awaits, no further fetches.

### Predicates

A **predicate** is a function that answers yes/no about one item:

```js
const isEven = (n) => n % 2 === 0;
console.log(isEven(4)); // prints: true
```

Passing a predicate into a search function lets the searcher stay generic: *it* walks the data, *you* define "found it."

### do...while

A `do...while` loop runs its body once *before* checking the condition — perfect for "always fetch at least one page":

```js
let i = 0;
do { console.log(i); i++; } while (i < 2); // prints: 0, 1
```

## 3. Walking through the original code

The pretend server:

```js
function getPage(cursor) {
  var start = cursor || 0;
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve({
        items: DATABASE.slice(start, start + 25),
        nextCursor: start + 25 < DATABASE.length ? start + 25 : null,
      });
    }, 10);
  });
}
```

Given a cursor (a start position), wait ~10ms (simulating the network), return 25 items and the next cursor — or `null` on the last page.

The everything-fetcher:

```js
async function fetchAllUsers() {
  var all = [];
  var cursor = null;
  while (true) {
    var page = await getPage(cursor);
    all = all.concat(page.items);
    if (page.nextCursor == null) break;
    cursor = page.nextCursor;
  }
  return all;
}
```

The classic cursor loop: fetch a page, append its items, follow the cursor, stop at `null`. Then return one giant array of all 250 users.

The search:

```js
async function findUser42() {
  var all = await fetchAllUsers();   // fetches ALL 10 pages...
  for (var i = 0; i < all.length; i++) {
    if (all[i].name == "user42") return all[i];
  }
```

First fetch *everything*, then scan. user42 is item 42 of 250 — pages 3 through 10 were pure waste.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: every question costs everything.** `fetchAllUsers` is the only tool available, so even "find one user" pays for all 250. How it bites you: your collection grows to 100,000 items. Now *every* lookup — even for the very first item — downloads 4,000 pages, takes minutes, and holds 100k objects in memory. The app gets slower as the business succeeds.

**Flaw 2: the waste is baked into the shape, not a missing optimization.** A function whose return type is "the whole array" *cannot* stop early — by the time the caller sees a single item, the loop has already finished. No amount of clever code inside `findUser42` can un-fetch pages 3–10. To fix it you must change the *interface*: hand out items as they arrive, instead of an array at the end.

**Flaw 3: every caller rewrites the cursor loop.** The while/cursor/nextCursor dance will be copy-pasted into every function that talks to this API — each copy with its own chance of an off-by-one on the last page or an infinite loop on a `null` mishap. Search a real codebase for `nextCursor` and count the hand-rolled copies.

## 5. Try it yourself first!

1. **Vague hint:** What if, instead of *returning an array at the end*, the fetcher could *hand out each item as soon as its page arrives*?
2. **Warmer:** That's exactly what a generator does with `yield`. And since fetching needs `await`, you need the combined form: `async function*`.
3. **The shape:** write `async function* paginate(getPage)` containing the cursor loop — but where the original did `all.concat(page.items)`, you do `yield* page.items`.
4. **The consumer:** `for await (const user of paginate(getPage)) { if (user.name === "user42") return user; }` — what happens to fetching when you `return`/`break` out?
5. **Check yourself:** add a counter inside `getPage`. Finding user42 (page 2 of 10) should cost exactly 2 requests.

## 6. Understanding the refactored solution

**The whole engine — seven lines:**

```js
export async function* paginate(getPage) {
  let cursor = null;
  do {
    const page = await getPage(cursor);
    yield* page.items;           // hand items out one by one
    cursor = page.nextCursor;
  } while (cursor !== null);
}
```

The cursor loop now exists in exactly **one** place. `await getPage(cursor)` fetches a page; `yield* page.items` hands its items to the consumer one at a time; the loop follows the cursor until `null`. Consumers write `for await (const item of paginate(getPage))` and never see a cursor again.

**Laziness does the optimizing.** The generator only runs when the consumer asks for the next item. If the consumer breaks out of the loop after item 42, the generator is simply never resumed — the `await getPage` for page 3 *never executes*. Nobody wrote "stop early" logic; early exit fell out of the shape.

**The helpers are one-liners on the stream:**

```js
export async function findFirst(getPage, predicate) {
  for await (const item of paginate(getPage)) {
    if (predicate(item)) return item; // break -> the generator stops fetching
  }
  return null;
}
```

And `collectAll` does what the original's `fetchAllUsers` did — but now fetching everything is an *explicit, named choice*, not the only door.

**The tests measure the efficiency itself.** `makeFakeApi` wraps the fake server with a request counter. The headline test:

```js
const found = await findFirst(getPage, (u) => u.name === 'user42');
assert.equal(requests(), 2);      // ...so exactly 2 requests. Original: 10.
```

When an abstraction's selling point is "fewer requests," test the request count — not just the returned value. Other tests: items stream across page boundaries in order; breaking after 3 items costs exactly 1 request; no match streams to the end and returns `null`; single-page and empty collections work.

## 7. Words you learned (glossary)

- **Pagination** — an API returning a big list in fixed-size chunks.
- **Page** — one chunk of items.
- **Cursor** — the bookmark you send back to get the next page.
- **`nextCursor: null`** — the "that was the last page" signal.
- **Generator (`function*`)** — a function that pauses at `yield`, handing out values one at a time.
- **`yield*`** — yield every element of an array (or another generator), one by one.
- **Async generator (`async function*`)** — a generator that can also `await`; yields values that arrive over time.
- **`for await...of`** — the loop that consumes an async generator.
- **Lazy** — doing work only when the next value is actually requested.
- **Eager** — doing all the work up front before returning anything.
- **Early termination** — stopping consumption (break/return) so remaining work never happens.
- **Stream** — a sequence of items consumed as they arrive, rather than a completed array.
- **Predicate** — a yes/no function about one item.
- **do...while** — a loop that always runs at least once.
- **Instrumented fake** — a test stand-in that counts how it was used (here: requests).
- **Off-by-one** — the classic bug of being one step short or one step over at a boundary.

## 8. Experiments to try on the plane (no internet needed)

1. **Count the original's waste.** In `original.js`, add `var requests = 0;` and `requests++` inside `getPage`, then log it at the end of `main`. Expected: `10` — ten fetches to find an item on page 2.
2. **Watch laziness with your own eyes.** In a scratch file import `paginate`, add a `console.log("fetching from", cursor)` inside a wrapper around `getPage`, and `break` after the first item. Expected: exactly one "fetching from null" line — pages 2+ never happen.
3. **Find the last user.** Use `findFirst` with `(u) => u.name === 'user250'` against a 250-item, 25-per-page fake API. Expected: 10 requests — laziness helps *when it can*; a worst-case search still visits everything.
4. **Write `take(n)`.** A helper that collects the first n items of the stream then breaks. `await take(30)` against the fake API. Expected: exactly 2 requests (30 items spans pages 1 and 2).
5. **Break the last-page condition on purpose.** In your own copy of `paginate`, change `while (cursor !== null)` to `while (cursor)` and make a fake API whose first page returns `nextCursor: 0` (a perfectly valid position!). Expected: the loop stops early and silently drops the rest — you've just met the off-by-one/falsy-cursor family of bugs the "write the loop once" rule protects everyone from.
