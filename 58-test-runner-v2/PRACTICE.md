# 🏋️ Practice: Test Runner v2

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a *copy* of `refactored/runner.js` (the exercises change the runner itself), plus a scratch test file that imports `createRunner` from your copy. Because `createRunner()` returns an instance, you can test your modified runner *with* `node --test`, exactly like `runner.test.js` does — runners inside a runner. All offline.

## Exercises

### ⭐ 1. Time every test (warm-up)

Add a `durationMs` field to every pass/fail result: how long the test took, hooks included. Skipped tests get no timing (they never ran).

What it practices: threading one new fact through the run-vs-report split without touching the reporter's contract.
Expected: a test containing `await new Promise(r => setTimeout(r, 25))` reports `status: 'pass'` with `durationMs >= 20`; a skipped test's result has no `durationMs` key.
Hint: `Date.now()` once before the `try`, subtract when pushing the result. Two push sites, one skip site.

### ⭐⭐ 2. A throwing `describe` can't corrupt the tree

`describe` restores the cursor in a `finally` — but no test proves it. Write a meta-test: a `describe` whose body throws propagates its error to the caller, **and** an `it` registered afterwards lands at the root (not inside the broken suite), and `run()` still works.

What it practices: testing cleanup-on-failure paths — the kind of guarantee that silently rots without a test.
Expected: `assert.throws` on the bad describe; then one result, named without any suite prefix, status `'pass'`.
Hint: after the throw, check the *full name* of the later test — if the cursor leaked, the name would start with `'broken > '`.

### ⭐⭐ 3. `it.todo` — a visible IOU

Add `it.todo(name)` (no function): registers a placeholder that is never executed and shows up in results as `status: 'todo'`. Also teach `report()` its icon. A todo must survive an `it.only` elsewhere in the suite — it stays `'todo'`, not `'skip'`.

What it practices: extending the mode system (`normal`/`only`/`skip`) and deciding precedence when modes collide.
Expected: results contain `{ name, status: 'todo' }`, no error thrown even though `fn` is missing; with an `it.only` present, the todo still reports `'todo'`.
Hint: handle `'todo'` *before* the only/skip check in `runTest`.

### ⭐⭐ 4. `it.fails` — expected failure

Add `it.fails(name, fn)` for documenting known bugs: the test **passes if it throws** and **fails if it passes**, with the error message `expected failure, but the test passed`. This inverts the meaning of red and green for one test without touching the others.

What it practices: separating "what happened" (error or not) from "what that means" (pass/fail policy).
Expected: `it.fails('known bug', () => { throw new Error('still broken') })` → `'pass'`; `it.fails('fixed now?', () => {})` → `'fail'` with that message.
Hint: run the test exactly as normal; at the very end, if `mode === 'fails'`, swap the verdict instead of reporting it straight.

### ⭐⭐⭐ 5. Per-test timeout

Support `it(name, fn, { timeoutMs })`: if the test function doesn't settle in time, the test **fails** with `timed out after <n>ms` instead of hanging the whole run — project 43's deadline lesson applied to the runner itself. Tests without the option behave exactly as before.

What it practices: `Promise.race` against a timer, and cleaning the timer up so a fast pass doesn't leave the process ticking.
Expected: a test that sleeps 100 ms with `timeoutMs: 20` → `'fail'`, error matching `/timed out after 20ms/`; the same test with no option passes; a fast test with a timeout passes with no stray timer.
Hint: race `Promise.resolve().then(test.fn)` against a rejecting timer; `clearTimeout` in a `finally`.

### ⭐⭐⭐ 6. `beforeAll` / `afterAll`

Add suite-level hooks: `beforeAll` runs once before the first test in its suite (before any `beforeEach`), `afterAll` once after the suite's last test **and** after all its child suites. Multiple `afterAll`s in one suite unwind in reverse registration order.

What it practices: putting once-per-suite work in `runSuite` (per-test work lives in `runTest`) — the tree earns its keep again.
Expected: a suite with two tests and a counter-incrementing `beforeAll` ends with the counter at `1` (not 2); log order for a suite with one child: `['beforeAll', 'test1', 'childTest', 'afterAll']`.
Hint: two new arrays on `makeSuite`; `runSuite` brackets its existing loops with them. No `lineage` needed — recursion already visits parents first.

## Solutions

### 1. `durationMs`

```js
// in runTest, after the skip branch:
const startedAt = Date.now();
// ...try/catch/finally unchanged...
const durationMs = Date.now() - startedAt;
results.push(error
  ? { name: fullName, status: 'fail', error, durationMs }
  : { name: fullName, status: 'pass', durationMs });
```

WHY: the timing wraps hooks *and* test because that's what the human waits for. It rides on the existing results-as-data design — `run()` stays print-free, and any reporter can now sort by slowness without the runner knowing reporters exist. Assert `>= 20`, not `>= 25`: timers can fire a hair early, and a flaky meta-test would betray the whole project.

### 2. Throwing `describe` meta-test

```js
test('a throwing describe restores the cursor', async () => {
  const r = createRunner();
  assert.throws(() => r.describe('broken', () => { throw new Error('setup exploded'); }),
    /setup exploded/);
  r.it('lands at the root', () => {});
  const results = await r.run();
  assert.deepEqual(results.map((x) => [x.name, x.status]),
    [['lands at the root', 'pass']]);
});
```

WHY: the `finally` in `describe` is a one-line guarantee that only shows its value when a registration body explodes — exactly the moment nobody is watching. The assertion on the *name* is the sharp part: a leaked cursor wouldn't crash anything, it would just silently file later tests under `'broken > '`, and only the full-name check catches that. (The empty `broken` suite still exists in the tree; with zero tests it contributes zero results.)

### 3. `it.todo`

```js
it.todo = (name) => { current.tests.push({ name, fn: null, mode: 'todo' }); };

// in runTest, BEFORE the only/skip check:
if (test.mode === 'todo') {
  results.push({ name: fullName, status: 'todo' });
  return;
}

// in report():
const icon = { pass: 'ok  ', fail: 'FAIL', skip: 'skip', todo: 'todo' };
```

WHY: a todo is a *promise to write a test*, so it must never run (`fn` is `null` — executing it would crash) and must stay visible even in `.only` mode, which is why its branch comes first: precedence is a decision, and putting the check before `sawOnly` encodes "a todo is information, not a runnable thing". This is the README's own argument that dropped tests are lies — todos stay on the report.

### 4. `it.fails`

```js
it.fails = (name, fn) => { current.tests.push({ name, fn, mode: 'fails' }); };

// in runTest, replace the final results.push with:
if (test.mode === 'fails') {
  results.push(error
    ? { name: fullName, status: 'pass' }
    : { name: fullName, status: 'fail',
        error: new Error('expected failure, but the test passed') });
} else {
  results.push(error
    ? { name: fullName, status: 'fail', error }
    : { name: fullName, status: 'pass' });
}
```

WHY: execution is untouched — hooks run, the fn is awaited, errors are caught exactly as before; only the last step reinterprets the outcome. That separation (mechanism records `error`, policy decides pass/fail) is the same decide/do split as `run()` vs `report()`, applied one level down. When someone fixes the documented bug, the suite goes red and forces them to delete the `it.fails` — the marker can't go stale silently.

### 5. Per-test timeout

```js
function it(name, fn, { timeoutMs } = {}) {
  current.tests.push({ name, fn, mode: 'normal', timeoutMs });
}

// in runTest, replace `await test.fn();` with:
if (test.timeoutMs === undefined) {
  await test.fn();
} else {
  let timer;
  const deadline = new Promise((_, rejectRace) => {
    timer = setTimeout(
      () => rejectRace(new Error(`timed out after ${test.timeoutMs}ms`)),
      test.timeoutMs);
  });
  try {
    await Promise.race([Promise.resolve().then(test.fn), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
```

WHY: `Promise.race` turns "never settles" into "fails at the deadline" — a hang is the one failure a runner can't otherwise report, because the false-green fix (awaiting) is exactly what makes a hung test hang the *runner*. `Promise.resolve().then(test.fn)` matters: it routes a synchronously-throwing fn into the race as a rejection instead of blowing past it. The `clearTimeout` in `finally` releases the timer on the fast path so a green suite exits promptly.

### 6. `beforeAll` / `afterAll`

```js
const makeSuite = (name, parent) => ({
  name, parent, suites: [], tests: [],
  beforeEach: [], afterEach: [], beforeAll: [], afterAll: [],
});
const beforeAll = (fn) => current.beforeAll.push(fn);
const afterAll = (fn) => current.afterAll.push(fn);

async function runSuite(suite, results) {
  for (const hook of suite.beforeAll) await hook();
  for (const test of suite.tests) await runTest(suite, test, results);
  for (const child of suite.suites) await runSuite(child, results);
  for (const hook of [...suite.afterAll].reverse()) await hook();
}

return { describe, it, beforeEach, afterEach, beforeAll, afterAll, run };
```

WHY: per-test hooks live in `runTest` and walk the `lineage`; once-per-suite hooks live in `runSuite`, where the recursion already provides the right shape for free — parents enter before children and exit after them, so `beforeAll` naturally precedes every descendant test and `afterAll` follows them all. Reversing `afterAll` mirrors the `afterEach` unwind rule: teardown happens in the opposite order of setup. This is the payoff of storing suites as a tree instead of the original's single global slot.
