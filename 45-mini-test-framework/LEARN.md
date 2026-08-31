# 📘 Learning Guide: Mini Test Framework

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny but real **test framework** — the kind of tool that ran every `node --test` in this repo. You've been *using* one for 44 projects; now you build one in ~60 lines, and it stops being magic.

The original is what everyone writes first: a script of `if (result === expected) console.log("ok")` checks. Run it:

```
ok: fizz
ok: buzz
FAIL: crashed - fizzbuz is not defined
ok: plain
```

The refactored framework, run via `node refactored/demo.js`, prints:

```
  ok    multiples of 3 are Fizz
  ok    multiples of 5 are Buzz
  ...
7/7 passed
```

...and, crucially, tells the *operating system* whether tests passed, so automated systems can react.

## 2. Concepts you need first

### What a test is

A **test** is code that runs your real code with known inputs and checks the outputs. If the check fails, the test **fails** loudly. A collection of tests is a **suite**. The program that runs them and reports results is a **test runner** or **framework**.

### Assertions

An **assertion** is the checking part: "these two things must be equal, or blow up."

```js
function assertEqual(actual, expected) {
  if (actual !== expected) throw new Error(`expected ${expected}, got ${actual}`);
}
assertEqual(2 + 2, 4);  // silence = pass
assertEqual(2 + 2, 5);  // throws: expected 5, got 4
```

Note the design: assertions **throw** on failure. That's what lets a runner catch failures with try/catch.

### Deep equality vs `===`

`===` compares objects by *identity* (are they the same object?), not contents:

```js
console.log([1, 2] === [1, 2]); // prints: false (!)
```

**Deep equality** compares contents, all the way down — `[1, [2]]` deep-equals `[1, [2]]`. Test assertions need deep equality, because tests compare *values*, not identities. (This repo built a `deepEqual` in project 25; the framework imports it.)

### Callbacks and registration

You hand a test framework a name and a function: `test("adds", () => {...})`. Key subtlety: calling `test()` does **not** run your function. It just *stores* it in a list (**registration**). A separate `run()` step executes the list later. This two-phase design is why frameworks can count tests, filter them, or shuffle them *before* running anything.

### try / catch and isolation

`try { risky() } catch (e) { handle(e) }` catches an error so the program survives. Running *each* test inside its own try/catch gives **isolation**: one crashing test fails alone, and the rest still run.

### async tests and `await fn()`

If a test function is `async`, it returns a Promise. A runner that calls `fn()` without `await` would mark the test "passed" before it even finished! `await fn()` waits — three characters, and async tests just work.

### Exit codes (how machines read results)

Every program tells the operating system how it ended with an **exit code**: `0` = success, anything else = failure. Humans read printed text; **CI** systems (Continuous Integration — servers that automatically run your tests on every change) read *only the exit code*. In Node, setting `process.exitCode = 1` makes the process report failure when it ends. A test script that fails but exits 0 is lying to every machine that asks.

### Regular expressions (for matching error messages)

A **regular expression** (regex) is a pattern for matching text, written between slashes. `pattern.test(str)` asks "does it match?":

```js
const pattern = /bad input/;
console.log(pattern.test("very bad input!")); // prints: true
console.log(pattern.test("all good"));        // prints: false
```

`assertThrows(fn, /bad input/)` uses one to check that the *right* error was thrown.

## 3. Walking through the original code

The function under test:

```js
function fizzbuzz(n) {
  var parts = [];
  if (n % 3 === 0) parts.push("Fizz");
  if (n % 5 === 0) parts.push("Buzz");
  return parts.length ? parts.join("") : String(n);
}
```

Multiples of 3 → "Fizz", of 5 → "Buzz", of both → "FizzBuzz", others → the number as a string.

Then the checks — the same five lines, over and over:

```js
if (fizzbuzz(3) === "Fizz") {
  console.log("ok: fizz");
} else {
  console.log("FAIL: fizz");
}
```

Check 3 is the interesting one:

```js
try { // (try/catch added after the crash cost an afternoon)
  if (fizzbuz(15) === "FizzBuzz") {
```

`fizzbuz` — a typo — is not defined, so this line *crashes*. Because checks are just top-level statements, a crash here would kill checks 4 and beyond. The try/catch you see was patched in *after* that exact accident cost someone an afternoon. And notice: even when checks print `FAIL`, the script finishes normally — exit code 0.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: one crash hides all later results.** Without that patched-in try/catch, the typo in check 3 stops the script — checks 4, 5, 6... never run. You fix the typo, run again, and discover the *next* problem. One bug per run is a miserable debugging loop; you want the full damage report every time.

**Flaw 2: no summary.** Twenty "ok" lines and one "FAIL" buried in the middle. By day two, nobody reads the wall of green — and the day the FAIL appears, nobody notices. A single `19/20 passed` line is what eyes actually check.

**Flaw 3 (the killer): exit code 0 on failure.** Hook this script into CI and here's the bite: a teammate breaks fizzbuzz next month. The script dutifully prints `FAIL: fizz`... into a log nobody opens, and exits 0. CI sees 0, marks the build green, the broken code ships. A test that fails quietly is worse than no test — it's a false alibi: everyone *believes* the code is checked.

## 5. Try it yourself first!

1. **Vague hint:** The five-line if/else is repeated for every check. Extract the repetition into helpers — one for checking, one for running.
2. **Warmer:** Write `assertEqual(actual, expected)` that *throws* on mismatch, and `test(name, fn)` that stores `{ name, fn }` in an array — without running it.
3. **The runner:** write `run()` that loops the array, calls each `fn` inside try/catch, prints `ok`/`FAIL` per test, and counts.
4. **Async:** make the loop `await fn()` and `run()` itself `async` — now async test functions work too.
5. **The machine-facing line:** after the loop, set `process.exitCode = failures > 0 ? 1 : 0`. That single line is what makes your framework CI-worthy.

## 6. Understanding the refactored solution

**Phase 1 — registration:**

```js
const tests = [];
export function test(name, fn) {
  tests.push({ name, fn });
}
```

`test()` only collects. Nothing runs. That split — collect first, run later — is the invisible architecture of every framework you'll use: it's why they can print "running 7 tests," filter by name, or run tests in parallel *before* touching your code.

**Phase 2 — the runner:**

```js
for (const { name, fn } of tests) {
  try {
    await fn(); // await: async tests work for free
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`  FAIL  ${name}`);
```

Each test in its own try/catch = isolation: a crash fails *one* test and the loop continues. (Same pattern as project 38's listener isolation — recurring idea, new domain.) The `await` means an `async` test's failures are actually waited for and caught. Then the summary line, and the line the original was missing:

```js
process.exitCode = failures.length > 0 ? 1 : 0;
```

Humans read the summary; machines read the exit code; both now tell the truth.

**The assertions:**

```js
export function assertEqual(actual, expected, label = 'values') {
  if (!deepEqual(actual, expected)) {
    throw new Error(`${label}: expected ${show(expected)}, got ${show(actual)}`);
  }
}
```

An assertEqual *is* a deep-equal plus a good message. The message carries `expected` and `got` — because when a test fails at 2 a.m., the message is the debugging. `assertThrows(fn, pattern)` handles the three cases people forget: fn threw the right error (pass, return it), threw the *wrong* error (fail with a different message), didn't throw at all (fail).

**The two companion files close two loops.** `demo.js`: our framework testing project 01's real fizzbuzz — including one `async` test and one `assertThrows` test — ending in `run()`. `framework.test.js`: node's *real* test runner testing *our assertions* (does `assertEqual` throw with expected-vs-got in the message? is it deep, not reference-based?). Tools all the way down — every layer checked by another.

## 7. Words you learned (glossary)

- **Test / suite** — code that checks code / a collection of such checks.
- **Test runner / framework** — the program that executes tests and reports.
- **Assertion** — a check that throws on failure.
- **Deep equality** — comparing contents recursively, not object identity.
- **`===` on objects** — compares identity: `[1] === [1]` is false.
- **Registration** — `test()` storing the test for later, not running it.
- **Two-phase (collect, then run)** — the architecture that lets frameworks count/filter/order tests.
- **Isolation** — one test's crash can't stop the others.
- **`await fn()`** — how a runner supports async tests.
- **Exit code** — the number a program reports on exit: 0 = success, nonzero = failure.
- **`process.exitCode`** — Node's way to set the exit code without quitting immediately.
- **CI (Continuous Integration)** — servers that run your tests automatically and read only the exit code.
- **Regular expression (regex)** — a text-matching pattern like `/bad input/`.
- **`assertThrows`** — asserts a function throws, optionally the *right* error.
- **False alibi** — a failing check that reports success, making everyone trust broken code.

## 8. Experiments to try on the plane (no internet needed)

1. **See the lie.** Run `node 45-mini-test-framework/original.js` then check the exit code (`echo $LASTEXITCODE` in PowerShell, `echo $?` in bash). Expected: `0` — despite the FAIL line in the output.
2. **See the truth.** Break a case in `demo.js` (change `'Fizz'` to `'Fuzz'` in the first test), run it, check the exit code. Expected: a `FAIL` line with "expected "Fuzz", got "Fizz"", a `6/7 passed` summary, and exit code `1`. Fix it back.
3. **Prove isolation.** Add a test to `demo.js` that just does `throw new Error("kaboom")`, placed *before* the others. Expected: it FAILs, and all tests after it still run — compare with the original, where a crash needed a hand-patched try/catch.
4. **Prove the `await` matters.** In `framework.js`, change `await fn()` to `fn()`, then in `demo.js` make an async test that awaits a short sleep and then asserts `1 === 2` (via `assertEqual(1, 2)`). Expected: the run reports it as *passing* — the runner stopped waiting for the verdict. Put the `await` back.
5. **Add a feature frameworks have.** Give `test` a variant `test.skip(name, fn)` that registers `{ name, fn, skip: true }`, and make `run()` print `  skip  name` without executing it. Expected: skipped tests appear in the output but never run and never fail — you've just demystified another feature of the big frameworks.
