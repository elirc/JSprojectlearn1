# 🏋️ Practice: Mini Test Framework

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Pin down what "equal" means (warm-up)

`assertEqual` inherits five design decisions from project 25's `deepEqual`, and `framework.test.js` checks none of them. Add a test asserting all five through `assertEqual`: `NaN` equals `NaN`; `{a:1,b:2}` equals `{b:2,a:1}` (key order irrelevant); `{a: undefined}` does *not* equal `{}`; two `Date`s with the same timestamp are equal; and `'1'` does not equal `1`. Predict each answer before running.

What it practices: knowing exactly what your assertion library promises — every one of these is a decision some other framework makes differently.

Hint: use `assert.doesNotThrow(() => assertEqual(...))` for the equal cases and `assert.throws(...)` for the unequal ones.

### ⭐⭐ 2. Failure messages that do the debugging (core)

The README says the messages should do the debugging. Try `assertEqual({ a: 1 }, { a: 2 })` — you get `expected [object Object], got [object Object]`, which does nothing at all. Try `assertEqual(0, -0)` and you get `expected 0, got 0`. Fix `show`: objects and arrays get `JSON.stringify`, `-0` prints as `-0`, `Date`s print as ISO strings, strings keep their quotes. Check offline: the object case now reads `expected {"a":2}, got {"a":1}`, arrays read `expected [1,[3]], got [1,[2]]`, `assertEqual('1', 1)` reads `expected 1, got "1"`, and a *circular* object must not crash the assertion.

What it practices: error message design — and remembering that the code producing an error is running in an already-broken situation, so it must not throw itself.

Hint: `Object.is(value, -0)` is the only reliable `-0` check. `JSON.stringify` throws on circular structures, so wrap it in `try { ... } catch { return String(value); }`.

### ⭐⭐ 3. Make run() testable (core)

The test file's comment says testing `run()` "would need to capture stdout" — so remove the excuse. Change `run()` to `run({ log = console.log } = {})` and have it *return* a summary `{ passed, failed, failures }`. Also clear the registration list at the end so a second `run()` in the same process starts clean. Check offline in a node:test file: register a passing test and a throwing one, run with a collecting `log`, and assert the summary is `{ passed: 1, failed: 1 }`, `failures[0].name` is the failing test's name, and the captured lines are exactly `['  ok    passes', '  FAIL  fails', '        nope', '\n1/2 passed']`.

What it practices: injecting the output sink — the same "pass the effect in" move that makes `retry`'s sleep and project 39's clock testable.

Hint: watch out for one trap — `run` sets `process.exitCode = 1`, which would make your *own* node:test run fail. Reset `process.exitCode = 0` after asserting.

### ⭐⭐ 4. test.only (core)

When one test out of 200 fails you want to run just that one. Add `test.only(name, fn)`: if any test is registered with `only`, the runner executes *only* those and ignores the rest. Check offline: register `a`, `only('b')`, `c`, `only('d')` and assert that only `b` and `d` ran, in that order, with `summary.passed === 2`. Then confirm a suite with no `only` at all still runs everything.

What it practices: attaching a property to a function object, and a filter that changes the whole run based on registration data.

Hint: `test.only = (name, fn) => { onlyMode = true; test(name, fn, { only: true }); };` — functions are objects, so you can hang a method off `test` itself. Reset `onlyMode` when you clear the test list.

### ⭐⭐⭐ 5. beforeEach / afterEach (challenge)

Add `beforeEach(fn)` and `afterEach(fn)` hooks. The rules that matter: hooks may be async and must be awaited; `afterEach` must run *even when the test throws* (that's the whole point — cleanup happens on failure too); and a hook throwing should fail that test rather than crash the run. Check offline with a hook logging `'before'`/`'after'` around two tests, one passing and one throwing: the event log is exactly `['before','body1','after','before','body2','after']` and the summary reports 1 failure.

What it practices: `try/finally` as the guarantee that cleanup runs, and awaiting hooks the way the runner already awaits tests.

Hint: extract a `runOne(testCase)` helper. `for (const hook of beforeEachHooks) await hook();` then `try { await fn(); } finally { for (const hook of afterEachHooks) await hook(); }` — the outer runner's try/catch still turns any throw into a failure.

### ⭐⭐⭐ 6. A per-test timeout (challenge)

A test that awaits something which never settles hangs the whole run with no output — the worst possible failure mode. Add an options argument: `test(name, fn, { timeoutMs })`, and when the test outlives its deadline, fail it with `timed out after Nms` and move on. Compose project 43's `Promise.race` idea, and clear the timer so a fast test doesn't hold the process open. Check offline: a test returning `new Promise(() => {})` with `timeoutMs: 30` fails with that message while a `timeoutMs: 500` test that sleeps 1ms passes, the summary is `{ passed: 1, failed: 1 }`, and `afterEach` still runs for the timed-out test.

What it practices: applying a timeout to code you don't control, and noticing that a raced-out test keeps running invisibly.

Hint: `Promise.race([Promise.resolve().then(fn), deadline]).finally(() => clearTimeout(timer))`. Wrapping `fn` in `Promise.resolve().then(...)` also converts a *synchronously* thrown error into a rejection, so both kinds fail the same way.

## Solutions

### 1. What "equal" means

```js
test('assertEqual inherits deepEqual design decisions', () => {
  assert.doesNotThrow(() => assertEqual(NaN, NaN));                       // NaN === NaN here
  assert.doesNotThrow(() => assertEqual({ a: 1, b: 2 }, { b: 2, a: 1 })); // key order ignored
  assert.throws(() => assertEqual({ a: undefined }, {}));                 // different shapes
  assert.doesNotThrow(() => assertEqual(new Date('2026-01-01'), new Date('2026-01-01')));
  assert.throws(() => assertEqual('1', 1));                               // no type coercion
});
```

WHY: every one of these is a decision, not a law — a framework could reasonably say `NaN !== NaN` (that's what `===` says) or that `{a: undefined}` and `{}` are the same shape. Project 25 chose to match `assert.deepStrictEqual`, and this test documents that choice at the point where users meet it. Writing it also teaches the habit of asking "what does *my* assertEqual actually promise?" before trusting a green run. Verified by running: all five behave as stated.

### 2. A show() that helps

```js
function show(value) {
  if (typeof value === 'string') return JSON.stringify(value); // keep the quotes
  if (Object.is(value, -0)) return '-0';                       // the only -0 check
  if (typeof value !== 'object' || value === null) return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value); // circular structures must not break the failure path
  }
}
```

WHY: `String({a:1})` is `'[object Object]'`, which turns a failure message into a riddle — and since deep equality is the framework's headline feature, object comparisons are exactly the case that most needs a readable diff. `Object.is(value, -0)` is the only way to spot negative zero, because `-0 === 0` is `true` and `String(-0)` is `'0'`; without it, the one case where `deepEqual` deliberately distinguishes them produces a message claiming two identical values are different. The try/catch is the discipline point: this code runs *after* something already went wrong, so it must never be the thing that throws. Verified by running: `expected {"a":2}, got {"a":1}`, `expected [1,[3]], got [1,[2]]`, `expected -0, got 0`, `expected 1, got "1"`, and a circular object degrades gracefully.

### 3. A testable run()

```js
export async function run({ log = console.log } = {}) {
  const selected = [...tests]; // a COPY — see why below
  const failures = [];

  for (const { name, fn } of selected) {
    try {
      await fn();
      log(`  ok    ${name}`);
    } catch (err) {
      failures.push({ name, err });
      log(`  FAIL  ${name}`);
      log(`        ${err.message}`);
    }
  }

  log(`\n${selected.length - failures.length}/${selected.length} passed`);
  process.exitCode = failures.length > 0 ? 1 : 0;

  tests.length = 0; // a second run() in this process starts clean
  return { passed: selected.length - failures.length, failed: failures.length, failures };
}
```

```js
test('run() reports a summary and prints one line per test', async () => {
  frameworkTest('passes', () => {});
  frameworkTest('fails', () => { throw new Error('nope'); });

  const lines = [];
  const summary = await run({ log: (line) => lines.push(line) });

  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.failures[0].name, 'fails');
  assert.deepEqual(lines, ['  ok    passes', '  FAIL  fails', '        nope', '\n1/2 passed']);
  process.exitCode = 0; // undo run()'s global side effect
});
```

WHY: `console.log` is a hard-wired dependency on the outside world, and swapping it for a parameter converts the runner's whole output into an array a test can assert on — no stdout capture, no subprocess. The `[...tests]` copy is not decoration: without it, `selected` *is* `tests`, so `tests.length = 0` empties it before the return statement reads `selected.length`, and the summary comes back with `passed: -1`. (That bug happened while writing this solution, which is a fair advertisement for returning data you can assert on.) The `process.exitCode` reset in the test is the honest cost of a global side effect: `run` is designed to tell the OS about failures, and a test that deliberately fails a test would otherwise fail your own suite. Verified by running: the summary and all four log lines match exactly.

### 4. test.only

```js
let onlyMode = false;

export function test(name, fn, options = {}) {
  tests.push({ name, fn, ...options });
}

test.only = (name, fn, options = {}) => {
  onlyMode = true;
  test(name, fn, { ...options, only: true });
};

// in run():
const selected = onlyMode ? tests.filter((t) => t.only) : [...tests];
// ...and when clearing at the end:
onlyMode = false;
```

WHY: `test` is a function *and* an object, so `test.only` is just a property — which is exactly how the real frameworks do it, and seeing that demystifies the syntax. Setting `onlyMode` at *registration* time rather than scanning at run time means the decision is made before the runner starts, so the filter is a single line. Note the design consequence: `only` is a debugging aid you must never commit, because a stray `test.only` silently reduces a 200-test suite to one — which is why CI configs usually ban it. Verified by running: `b` and `d` ran in that order with `passed: 2`, and a suite with no `only` still runs everything.

### 5. beforeEach / afterEach

```js
const beforeEachHooks = [];
const afterEachHooks = [];

export const beforeEach = (fn) => beforeEachHooks.push(fn);
export const afterEach = (fn) => afterEachHooks.push(fn);

async function runOne({ fn }) {
  for (const hook of beforeEachHooks) await hook();
  try {
    await fn();
  } finally {
    for (const hook of afterEachHooks) await hook(); // even if fn threw
  }
}

// run()'s loop body becomes: await runOne(testCase);
```

WHY: `finally` is the entire feature. Cleanup that only happens on success is worthless, because the test that leaves a temp file or an open connection behind is precisely the one that failed. The `await` in front of each hook is the same lesson as LEARN.md's experiment 4 — an un-awaited async hook returns a promise nobody watches, the test body starts before setup finished, and you get flakiness that looks like magic. Because `runOne` throws whatever the test (or a hook) threw, the runner's existing try/catch turns all of it into one failed test, preserving isolation. Verified by running: the event log is exactly `['before','body1','after','before','body2','after']` with 1 failure, and an async `beforeEach` is genuinely waited for.

### 6. Per-test timeout

```js
async function runOne({ fn, timeoutMs }) {
  for (const hook of beforeEachHooks) await hook();
  try {
    const call = Promise.resolve().then(fn); // sync throws become rejections
    if (timeoutMs === undefined) return await call;

    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    await Promise.race([call, deadline]).finally(() => clearTimeout(timer));
  } finally {
    for (const hook of afterEachHooks) await hook();
  }
}
```

WHY: a hang is worse than a failure because it produces no information at all — the run just stops, and in CI it burns the job's whole time budget before being killed. Racing each test against a timer converts that into an ordinary red line with a useful message. `clearTimeout` in the `.finally` is project 43's leaked-timer lesson exactly: without it, a suite of 500 fast tests each leaves a pending 5-second timer and the process refuses to exit. Be honest about what this does *not* do: the timed-out test keeps running in the background, since JavaScript can't cancel it — the runner has simply stopped waiting, which is why a hanging test should be fixed rather than timed out forever. Verified by running: the hanging test fails with `timed out after 30ms`, the fast one passes, and `afterEach` still ran for the timed-out test.
