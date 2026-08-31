# 📘 Learning Guide: Test Runner v2

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **test runner**: a small program whose job is to run *other* little programs (tests) and tell you which ones passed and which ones failed.

A **test** is just a function that checks something. If the check is wrong, the function throws an error. The runner catches those errors and prints a scoreboard:

```
  ok    adds numbers
  FAIL  saves user — expected 999 rows
1 passed, 1 failed
```

Tools like Jest and Mocha (popular testing programs) are big versions of exactly this. In this project we build our own, then fix a scary bug in it: **async tests that fail but get reported as passing**.

## 2. Concepts you need first

### Throwing and catching errors
`throw` stops a function immediately with an error. `try/catch` lets you trap that error instead of crashing:

```js
try {
  throw new Error("oops");
} catch (e) {
  console.log("caught:", e.message); // prints: caught: oops
}
```

A test "fails" by throwing. The runner "notices" by catching.

### Callbacks — functions passed as values
In JavaScript a function is a value, like a number. You can hand one to another function to call later:

```js
function runTwice(fn) { fn(); fn(); }
runTwice(() => console.log("hi")); // prints: hi, hi
```

When you write `it("name", () => {...})`, you are handing the runner a callback to call later.

### Promises — a receipt for a value that isn't ready yet
A **Promise** is an object that says "the result will arrive later." It ends in one of two ways: **resolved** (success, with a value) or **rejected** (failure, with an error).

```js
const p = new Promise((resolve) => setTimeout(() => resolve(42), 100));
p.then((v) => console.log("got", v)); // ~100ms later prints: got 42
```

`setTimeout(fn, ms)` is a built-in that runs `fn` after `ms` milliseconds — that's how we fake "slow" work like a database call.

### async / await
An `async` function *always returns a Promise*. Inside it, `await` pauses until a Promise finishes and gives you its value (or throws its error):

```js
async function main() {
  const v = await Promise.resolve(7);
  console.log(v); // prints: 7
}
main();
```

**The key fact this whole project hangs on:** when an async function throws, the error does NOT explode immediately. It becomes a **rejected Promise**. If nobody `await`s that Promise, nobody ever sees the error — until Node kills the process later with an "unhandled rejection." This is what breaks the original runner.

```js
async function boom() { throw new Error("bad"); }
try { boom(); } catch (e) { console.log("never runs"); }
// nothing is caught! the error is inside the ignored Promise
```

### Hooks: beforeEach and afterEach
A **hook** is a function the runner calls automatically around every test. `beforeEach` runs *before* each test (set up a fresh world), `afterEach` runs *after* (clean up). This gives every test a clean start so test A can't mess up test B.

### Module state vs. instances
**Module-global state** means variables that live at the top of a file — every part of the program shares them. An **instance** is a fresh object made by a factory function; each call gives you an independent copy:

```js
function makeCounter() { let n = 0; return { inc: () => ++n }; }
const a = makeCounter(), b = makeCounter();
a.inc(); a.inc();
console.log(a.inc(), b.inc()); // prints: 3 1  — independent!
```

### Trees and recursion
A **tree** is data shaped like a family: each node has children, which have their own children. `describe` blocks nest inside each other, so suites form a tree. **Recursion** means a function that calls itself to walk such a shape (run this suite, then run each child suite the same way).

### export / import
`export` marks something in a file as usable elsewhere; `import` pulls it in. That's how `runner.test.js` gets `createRunner` from `runner.js`.

## 3. Walking through the original code

The original stores everything in shared top-of-file variables:

```js
var tests = [];
var passed = 0;
var failed = 0;
var globalBefore = null;
function beforeEach(fn) { globalBefore = fn; }
function it(name, fn) { tests.push({ name: name, fn: fn }); }
```

`it` doesn't run your test — it just saves it (name + function) into the `tests` array for later. `beforeEach` saves ONE setup function into a single slot. Note: one slot. Call `beforeEach` twice and the second call overwrites the first.

Then `run()` loops over the saved tests:

```js
try {
  if (globalBefore) globalBefore();
  t.fn();
  passed++;
  console.log("  ok:", t.name);
} catch (e) {
  failed++;
  console.log("  FAIL:", t.name, "-", e.message);
}
```

Run the setup, run the test, count it as passed — unless it threw, in which case catch and count it as failed. Simple, and correct *for synchronous tests only*.

The demo at the bottom registers one sync test that fails, and one async test that fails:

```js
it("ASYNC test that fails... and passes", async function () {
  await new Promise(function (r) { setTimeout(r, 5); });
  throw new Error("this failure is invisible"); // rejection nobody awaits
});
```

Run the file and it prints `1 passed, 1 failed` — the async failure was counted as a PASS. Then, about 5 milliseconds later, the ignored rejection surfaces and crashes the whole process.

## 4. What's wrong with it (in beginner terms)

**1. The false-green bug.** `t.fn()` calls an async test, which instantly returns a Promise and keeps working in the background. The runner doesn't wait, sees no error, and stamps "ok". *How it bites you:* your team's database tests are all async. One day saving users starts failing. Every test still shows green, you ship, and customers hit the bug your tests were supposed to catch. A test suite that can't turn red is worse than no tests — it makes you confident about broken code.

**2. One global `beforeEach` slot.** Last assignment wins. *How it bites you:* your file sets up a fake database in `beforeEach`. A teammate's file, loaded after yours, sets its own `beforeEach`. Yours silently disappears, and your tests start failing (or worse, passing) for reasons that look supernatural.

**3. No `afterEach`.** Cleanup has to live at the bottom of each test. But when a test throws, the rest of its body never runs — so a failing test skips its own cleanup. *How it bites you:* test 12 fails and leaves junk rows in the shared database object; tests 13 through 40 now fail too. You spend an hour debugging tests that were never broken.

**4. No `.only` / `.skip`.** *How it bites you:* you want to debug one test out of 400. Your only option is commenting out 399 of them — then remembering to uncomment them all.

**5. Everything is module-global.** You can't test the runner itself, because just running it changes the shared `tests`, `passed`, `failed` variables for everyone in the process.

## 5. Try it yourself first!

Try fixing the original before reading on. Hints, vaguest first:

1. The biggest bug is about *waiting*. What does an `async` function return, and what does the original do with it?
2. If a function might return a Promise, what keyword makes the caller pause until it settles — and what must the caller itself become to use that keyword?
3. Make `run()` an `async function` and change `t.fn()` to `await t.fn()`. Now the `catch` sees async failures. (Also `await` the hooks.)
4. For hooks: instead of one `globalBefore` variable, keep an *array* of beforeEach functions and run them all. For nesting, you need a tree: each `describe` creates a node with its own `tests`, `beforeEach`, `afterEach`, and child suites.
5. For `afterEach` that always runs: look up `try { ... } finally { ... }` — the `finally` block runs whether or not the `try` threw.
6. For `.only`: give each test a `mode` field. If ANY test is marked `only`, report every non-`only` test as "skipped" instead of running it.

## 6. Understanding the refactored solution

**A factory instead of globals.** `createRunner()` builds a fresh runner object each call and returns `{ describe, it, beforeEach, afterEach, run }`. All the state (the suite tree, the `sawOnly` flag) lives inside that one call — two runners can't touch each other.

**The suite tree and the cursor.** `makeSuite` creates a node holding `tests`, `beforeEach`, `afterEach`, and child `suites`. A variable called `current` points at "the suite we're inside right now":

```js
function describe(name, fn) {
  const suite = makeSuite(name, current);
  current.suites.push(suite);
  const prev = current;
  current = suite;
  try { fn(); } finally { current = prev; }
}
```

Entering a `describe` moves the cursor down; when its body finishes, the cursor moves back up (in a `finally`, so even a crashing `describe` body can't leave the cursor stranded). `it` and the hooks simply register on whatever `current` points at.

**Hooks run in the right order.** `lineage(suite)` walks parent pointers up to the root and returns the chain root-to-leaf. Then: all `beforeEach` hooks run **outermost first** (parents set the stage), and in a `finally`, all `afterEach` hooks run **innermost first** (unwind in reverse). The `finally` guarantees cleanup happens even for failing tests, and `error ??= hookErr` (meaning "only keep the hook's error if there is no error yet") makes sure a broken cleanup hook can't hide the test's real failure.

**The one-word fix.** `await test.fn();` — the runner now waits for async tests, so their rejections land in the `catch` and become real failures.

**`.only` skips loudly.** If any test used `it.only`, every other test is *reported as skipped*, not silently missing. A summary that quietly drops tests would be a different kind of lie.

**Decide/do split.** `run()` returns an array of plain result objects — it never prints. `report()` is the only function that touches `console.log`. Separating "compute the answer" from "show the answer" is what makes the runner testable: tests inspect the returned array.

**The tests are meta-tests.** `runner.test.js` uses Node's built-in runner (`node:test` provides `test`, and `node:assert/strict` provides checks like `assert.equal`) to run *our* runner on tiny fake suites. The star test replays the original's invisible failure and asserts the status is `'fail'`. Others check hook ordering by pushing strings into an `order` array and comparing, and check that two runners in one process don't interfere.

## 7. Words you learned (glossary)

- **Test runner** — a program that runs test functions and reports pass/fail.
- **Test suite** — a named group of tests (made with `describe`).
- **Callback** — a function passed to another function to be called later.
- **throw / try / catch / finally** — raise an error / trap it / code that runs no matter what.
- **Promise** — an object representing a value (or error) that arrives later.
- **Resolved / rejected** — the success / failure ending of a Promise.
- **async/await** — syntax for writing Promise code; `await` pauses until a Promise settles.
- **Unhandled rejection** — a rejected Promise nobody awaited; the error escapes invisibly.
- **False green** — a failing test reported as passing.
- **Hook** — a function run automatically around tests (`beforeEach`/`afterEach`).
- **Module-global state** — shared variables at the top of a file.
- **Factory function** — a function that builds and returns a fresh object (`createRunner`).
- **Instance** — one independent object made by a factory.
- **Tree** — nested data where each node has children.
- **Recursion** — a function calling itself to walk nested data.
- **Cursor** — a variable tracking "where we are" in a structure (`current`).
- **Lineage** — the root-to-leaf chain of parents for a node.
- **`??=`** — assign only if the left side is currently `null`/`undefined`.
- **Meta-test** — a test that tests the testing tool itself.
- **Reporter** — the part that formats/prints results (`report`).

## 8. Experiments to try on the plane (no internet needed)

Everything here runs offline with just Node installed. (You were asked not to run node while *generating* these guides — but as the reader, running things is the whole point!)

1. **Break the fix on purpose.** In `refactored/runner.js`, change `await test.fn();` to `test.fn();`. Run `node --test 58-test-runner-v2/refactored/` — the "FALSE-GREEN FIX" test should now FAIL, proving the meta-test really guards the fix. Put the `await` back.
2. **Reverse a hook order.** In `runTest`, change `for (const s of chain)` (the beforeEach loop) to `for (const s of [...chain].reverse())`. The "nested beforeEach runs outermost-first" test fails and its message shows you the wrong order it observed.
3. **Add a `describe.skip`.** In `createRunner`, add `describe.skip = (name, fn) => {};` (register nothing). Write a quick test: a skipped describe's tests never appear in results. Harder version: mark the suite and report its tests as `skip` instead of dropping them — which behavior does the README argue for, and why?
4. **Make a hook error visible.** Write a mini suite where `afterEach` throws but the test passes. Check the result: status should be `fail` with the hook's error. Then make BOTH throw — confirm the *test's* error wins (that's the `error ??= hookErr` line).
5. **Watch the original crash.** Run `node 58-test-runner-v2/original.js`. Note the order: the summary `1 passed, 1 failed` prints FIRST, then the process dies from the invisible rejection. The scoreboard was printed before the truth arrived.
