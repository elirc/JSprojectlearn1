# 📘 Learning Guide: Search As You Type

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A search box that shows results *while* you type — no Search button. Open the HTML file, type `ba`, and a list appears: `banana`, `blackberry`... Type one more letter, `n`, and it narrows to `banana`. Under the hood, every search goes to a (fake) search service that takes a moment to answer, like a real server would. The page's job is to always show results matching **what's in the box right now** — which turns out to be surprisingly hard, because answers come back late and out of order.

Sample interaction:

```
you type: "ban"
status:   searching…
results:  banana        <- appears a moment later
```

## 2. Concepts you need first

**The input event.** Text boxes fire an `input` event on every keystroke. Attach a handler and you run code as the user types:

```js
// with <input id="q"> on the page:
document.getElementById("q").oninput = function () {
  console.log("box now contains:", this.value);
};
```

**Promises.** A Promise is a placeholder for a value that isn't ready yet. Code that asks a server for something gets a Promise immediately and the real answer later:

```js
const p = new Promise((resolve) => setTimeout(() => resolve("hi"), 500));
p.then((v) => console.log(v)); // prints "hi" after half a second
```

**setTimeout.** Runs a function once, after a delay in milliseconds. It's how this project fakes network slowness:

```js
setTimeout(() => console.log("late!"), 1000);
console.log("first");
// prints "first", then a second later "late!"
```

**async / await.** `await` pauses an `async` function until a Promise settles, so asynchronous code reads top-to-bottom:

```js
async function demo() {
  const answer = await Promise.resolve(42);
  console.log(answer); // 42
}
```

**Latency, and why it varies.** **Latency** is the wait between asking and getting an answer. Real servers answer in wildly different times — a broad query ("ba") matches more data and takes longer than a narrow one ("ban"). This project's fake API imitates that on purpose: shorter queries respond *slower*.

**Race conditions.** A **race condition** is a bug where the outcome depends on which of two overlapping operations happens to finish first. Fire request A, then request B; if B's answer arrives before A's, and your code just "paints whatever arrives," A's stale answer paints *last* and wins. Nothing crashes — the screen is simply wrong. These bugs hide on your fast machine and appear on real networks.

**Closures.** A closure is a function that keeps access to variables from where it was created — private memory that survives between calls:

```js
function makeCounter() {
  let n = 0;
  return () => ++n;
}
const count = makeCounter();
console.log(count(), count(), count()); // 1 2 3
```

Both tools in this project (debounce, latest-only) are closures: a returned function carrying a hidden variable.

**Debounce.** Wrapping a function so it only runs after the calls *stop* for a quiet period. Every new call cancels the pending one and restarts the wait. For typing: don't search on every keystroke; search 250 ms after the typing pauses.

```js
function debounce(fn, waitMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}
```

**Rest and spread (`...args`).** In a parameter list, `...args` collects all arguments into an array; in a call, `fn(...args)` spreads them back out. It's how a wrapper forwards any arguments without knowing them.

**Symbols and sentinels.** `Symbol('stale')` creates a value guaranteed unique — nothing else in the program can equal it. That makes it a perfect **sentinel**: a special marker meaning "not real data" that can never collide with actual results (unlike, say, `null`, which a real API might legitimately return).

```js
const STALE = Symbol('stale');
console.log(STALE === Symbol('stale')); // false — every Symbol is unique
```

**innerHTML vs textContent (the XSS lesson).** `element.innerHTML = str` treats the string as HTML — if the string contains `<script>` or crafted tags from a user, the page *executes* it. That attack is called **XSS** (cross-site scripting). `textContent` treats everything as plain text, always safe.

**Node's test runner.** `node --test` runs files ending in `.test.js`. Each `test(name, fn)` is one check; `assert.equal(a, b)` fails the test loudly if the values differ.

## 3. Walking through the original code

The fake API, with realistic variable latency:

```js
function searchApi(query) {
  requestCount++;
  // shorter queries = more results = slower response (realistic!)
  var delay = 800 - query.length * 150 + Math.random() * 100;
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(FRUITS.filter(function (f) { return f.indexOf(query) >= 0; }));
    }, Math.max(delay, 50));
  });
}
```

It returns a Promise that resolves, after a delay, with the fruits containing the query. A 2-letter query waits ~500 ms; a 3-letter one ~350 ms. That inversion — older query slower — is the trap.

```js
document.getElementById("q").oninput = function () {
  var query = this.value;
  if (!query) { document.getElementById("results").innerHTML = ""; return; }

  searchApi(query).then(function (results) {
```

Every keystroke immediately calls the API. Empty box clears the list. Then, *whenever* the response arrives:

```js
    var html = "";
    for (var i = 0; i < results.length; i++) html += "<li>" + results[i] + "</li>";
    document.getElementById("results").innerHTML = html;
```

...it builds an HTML string and paints it. No check whether this response still matches what's in the box. Last writer wins.

## 4. What's wrong with it (in beginner terms)

**1. A request per keystroke.** Typing "banana" fires six requests; five are for queries you abandoned within milliseconds. On a laptop demo, who cares. In production with ten thousand users, your search server does 6× the work — and you pay for it in server bills and slowdowns.

**2. The out-of-order race.** The one that ships to production. You type `ba` (a slow query starts), then `n` (a fast query starts). `ban`'s answer arrives first — screen briefly correct! — then `ba`'s slow answer limps in and *overwrites it*. You typed `ban`; you're looking at results for `ba`. No error, no crash, just quietly wrong data. And because localhost answers in order, you'll never see it until a user on hotel Wi-Fi files a bug you can't reproduce.

**3. Loading and "no results" look identical.** While waiting, the list is empty. When there are truly no matches, the list is also empty. The user typing `xyz` can't tell "still thinking" from "nothing found," so they wait... for nothing.

**4. innerHTML concatenation.** Building HTML by gluing strings is safe for a hardcoded fruit list — and a habit that turns fatal the day results echo anything user-typed, because then a user can inject live HTML/script into your page (XSS).

## 5. Try it yourself first!

Try fixing `original.html` before reading on:

1. Two separate problems hide here: too *many* requests, and *stale* responses painting. One fix each. Fixing only the first does not fix the second.
2. For too-many-requests: you want "wait until typing pauses, then search once." You've seen this tool — wrap the handler in a debounce.
3. For staleness, the vague version: when a response arrives, how could the code know whether a *newer* request has been made since?
4. More specific: keep a counter outside the function (a closure). Each call takes the next number as its "ticket." When its response arrives, compare its ticket to the newest issued. Not the newest? Throw the response away.
5. What should a stale call *return*, so the caller can tell "ignore me" apart from real results? A unique marker value — `Symbol('stale')`.
6. Edge case worth thinking through: an *old* request fails after a newer one was fired. Should the user see that error? (No — it's noise about a question nobody's asking anymore. But an error from the *newest* request must still surface.)

## 6. Understanding the refactored solution

**`makeLatestOnly(fn)` in `refactored/latest.js`** — the heart, small enough to quote whole:

```js
export function makeLatestOnly(fn) {
  let newestTicket = 0;
  return async (...args) => {
    const ticket = ++newestTicket;
    try {
      const result = await fn(...args);
      return ticket === newestTicket ? result : STALE;
    } catch (err) {
      if (ticket === newestTicket) throw err;
      return STALE;
    }
  };
}
```

`newestTicket` lives in the closure — shared by all calls, invisible to everyone else. Each call grabs the next ticket number, then awaits the real work. When the answer finally arrives, one question decides everything: *is my ticket still the newest issued?* Yes → deliver the result. No → someone called again while I waited; return `STALE`. The `catch` applies the same logic to failures: a stale call's error is swallowed as `STALE` (noise about an abandoned question), but the newest call's error re-throws, because real failures must surface.

**Why both debounce *and* latest-only?** They solve different halves. Debounce is *economy*: don't even ask until typing pauses — fewer requests. But debounce can't prevent overlap: pause 300 ms mid-word and two requests still fly, and the older can still return last. Latest-only is *correctness*: whatever overlaps, stale data cannot paint. (A third tool exists for real `fetch`: an AbortController, which actually cancels the network request. That saves bandwidth, but the ticket check remains the guarantee.)

**The wiring in `refactored/index.html`.** `searchApi` is wrapped once: `const search = makeLatestOnly(searchApi)`. `runSearch` awaits it and starts with the ignore-check: `if (results === STALE) return;`. `runSearch` is then wrapped in `debounce(runSearch, 250)`. The input handler sets a visible `…` status immediately — so **loading is a rendered state**, distinct from "No results", which `render` shows only when a finished search truly matched nothing. And rendering builds each `<li>` with `document.createElement` + `textContent` — no HTML string gluing, no XSS foothold. (The helpers are pasted inline in the HTML because pages opened straight from disk — `file://` — aren't allowed to import modules; the tested originals live in `latest.js`.)

**The tests in `latest.test.js`.** The clever bit is `controllable()`: a fake async function that *never resolves on its own* — it stores each call's `resolve`/`reject` in an array, so the test can settle them **in any order it wants**. That turns a flaky timing bug into a deterministic script: fire `latest('ba')` then `latest('ban')`, resolve the *second* first, then the first — and assert the old call got `STALE` while the new one delivered. Other tests scramble three calls, reject a stale call (swallowed) and the newest call (throws), and confirm plain sequential calls all work.

## 7. Words you learned (glossary)

- **input event** — fires on every change to a text box.
- **Promise** — a placeholder for a value that arrives later.
- **resolve / reject** — a Promise finishing with a value / with an error.
- **settle** — a Promise finishing either way.
- **async / await** — syntax to pause a function until a Promise settles.
- **setTimeout** — run a function once after a delay.
- **Latency** — the wait between asking and receiving an answer.
- **Race condition** — a bug where the outcome depends on finish order.
- **Stale** — data that was correct for an old question, not the current one.
- **Closure** — a function keeping private access to variables from its birthplace.
- **Debounce** — delay a function until calls stop for a quiet period.
- **Ticket / monotonic counter** — an ever-increasing number stamping each call so "newest" is checkable later.
- **Sentinel** — a special marker value meaning "not real data".
- **Symbol** — a guaranteed-unique JavaScript value; the perfect sentinel.
- **Rest/spread (`...`)** — collect arguments into an array / spread them back out.
- **innerHTML / textContent** — set HTML (executes markup) / set plain text (safe).
- **XSS** — an attack injecting live HTML/script through user-supplied text.
- **AbortController** — the tool that cancels a real in-flight fetch.
- **FIFO** — "first in, first out"; the order responses do *not* arrive in.
- **Deterministic test** — a test that controls timing so it can't randomly pass or fail.

## 8. Experiments to try on the plane (no internet needed)

Everything here is offline: the "API" is a `setTimeout` fake, both HTML files open straight from disk, and `node --test 54-search-as-you-type/` runs the unit tests with no network. (Only the README's AbortController suggestion would need a real server to matter.)

1. **Reproduce the race on demand.** Open `original.html`, type `ba`, pause one beat, type `n`. Expected: `banana` flashes, then wrongly reverts to the `ba` list. Repeat in `refactored/index.html`: the results stay correct.
2. **Watch debounce save requests.** In each file, type `banana` at normal speed and read the "requests sent" counter. Expected: original ≈ 6 requests; refactored 1–2.
3. **Turn off half the fix.** In `refactored/index.html`, change `const search = makeLatestOnly(searchApi);` to `const search = searchApi;`. Type `ba`, pause ~300 ms, type `n`. Expected: the race is back *despite debounce* — proof the two tools do different jobs. Undo it.
4. **Exaggerate the latency inversion.** In the refactor's `searchApi`, change `800` to `3000`. Expected: short queries now take ~seconds; the `…` loading status earns its keep, and stale results still never paint.
5. **Predict-then-run the tests.** Open `latest.test.js`, find the "three overlapping calls" test, and write down what you think `Promise.all(calls)` yields before looking at line 42. Then run `node --test 54-search-as-you-type/`. Expected: `[STALE, STALE, 'ban!']` — only the newest ticket delivers, no matter the resolution order.
