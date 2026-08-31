# 📘 Learning Guide: Largest Prime Factor

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A program that answers one math question: given a whole number, what is the biggest *prime* number that divides into it evenly?

Example: the factors of 13195 that are prime are 5, 7, 13, and 29 (because 5 × 7 × 13 × 29 = 13195). The biggest is 29. So:

```
largestPrimeFactor(13195)   →  29
largestPrimeFactor(6)       →  3      (6 = 2 × 3)
largestPrimeFactor(97)      →  97     (97 is itself prime)
```

Running `node original.js` prints `29` and then another answer for a bigger input. The real drama is the input that's *commented out*: 600851475143. The original program would grind on that for hours. The refactored one answers `6857` in a blink. Same question, same correct logic — wildly different usefulness. That's the whole lesson of this project.

## 2. Concepts you need first

**Division, remainders, and `%` (modulo).** `a % b` gives the *remainder* after dividing `a` by `b`. If the remainder is 0, `b` divides `a` evenly — we say `b` is a **factor** (or divisor) of `a`.

```js
console.log(10 % 3);   // prints: 1   (10 = 3×3 + 1 left over)
console.log(10 % 5);   // prints: 0   (5 divides 10 evenly)
console.log(10 % 5 === 0);  // prints: true — 5 is a factor of 10
```

**A prime number** is a whole number of 2 or more whose only factors are 1 and itself. 2, 3, 5, 7, 11, 13... are prime. 6 is not (2 × 3). 1 is *not* prime by definition.

**Prime factors.** Every whole number ≥ 2 breaks down into a multiplication of primes, in exactly one way. 60 = 2 × 2 × 3 × 5. Those primes are its *prime factors*; the largest prime factor of 60 is 5.

**A `for` loop** repeats code, counting as it goes.

```js
for (let i = 2; i <= 5; i++) {
  console.log(i);
}
// prints: 2  3  4  5
```

The three parts: start (`let i = 2`), keep-going condition (`i <= 5`), and step (`i++`, meaning add 1). Loops can also count *down* (`i--`).

**A `while` loop** repeats as long as a condition is true — no built-in counter.

```js
let n = 40;
while (n % 2 === 0) {
  n = n / 2;
}
console.log(n);   // prints: 5   (40 → 20 → 10 → 5)
```

That example is the heart of this project: it *divides out* every 2 from 40.

**Nested loops multiply work.** A loop inside a loop runs (outer count) × (inner count) times. 10 × 10 = fine. A billion × a billion = the universe ends first. Rough step-counting like this is the everyday version of what programmers call **big-O** — you don't need the formal math, just the habit of estimating.

**`return` inside a loop** exits the whole function immediately — a common way to say "found it, done looking."

```js
function firstEven(list) {
  for (const x of list) {
    if (x % 2 === 0) return x;   // stop at the first hit
  }
  return null;                    // null = "no answer exists"
}
console.log(firstEven([3, 7, 8, 10]));  // prints: 8
```

**Square roots and factor pairs.** Factors come in pairs that multiply to the number: for 36, the pairs are 1×36, 2×18, 3×12, 4×9, 6×6. Notice each pair has one member ≤ 6 (the square root of 36) and one ≥ 6. So if a number has *any* factor, it has one no bigger than its square root — meaning a search can stop there. Instead of computing a square root, code often writes the same idea as `factor * factor <= n`, which avoids decimal-precision worries.

**`throw` and `RangeError`.** `throw` stops the function and reports an error to the caller. `RangeError` is a built-in error type for "right kind of value, wrong range" — like asking for the prime factors of 1.5.

```js
function half(n) {
  if (n % 2 !== 0) throw new RangeError("need an even number");
  return n / 2;
}
```

**`Number.isInteger(x)`** is true only for whole numbers: true for 4, false for 4.5 and for `"4"` (a string).

**`export` / `import`.** A file (*module*) can `export` a function so another file can `import` and use it. This keeps logic separate from printing and lets tests import the function directly.

```js
// prime-factor.js
export function largestPrimeFactor(n) { /* ... */ }
// some other file
import { largestPrimeFactor } from './prime-factor.js';
```

**Tests.** A test file calls your function with known inputs and *asserts* the outputs. `assert.equal(a, b)` fails loudly if `a` isn't `b`; `assert.throws(fn, RangeError)` checks that calling `fn` throws that error. Node runs them with `node --test`. The magic here: a test can also pin down *speed*, indirectly — if the huge input finishes at all, the algorithm must be fast.

## 3. Walking through the original code

Two functions. First, a prime checker:

```js
function isPrime(x) {
  if (x < 2) return false;
  for (var i = 2; i < x; i++) {   // checks EVERY number below x
    if (x % i == 0) {
      return false;
    }
  }
  return true;
}
```

Plain English: numbers below 2 aren't prime. Then try every `i` from 2 up to `x - 1`; if any divides `x` evenly (`x % i == 0`), it's not prime. If nothing divided it, it's prime. Correct — but for `x` near 600 billion, that's up to 600 billion remainder checks *for one candidate*.

```js
function largestPrimeFactor(n) {
  for (var i = n; i >= 2; i--) {  // ...and starts from the TOP
    if (n % i == 0 && isPrime(i)) {
      return i;
    }
  }
  return null;
}
```

The strategy: start at `n` itself and count *down*. The first number that both divides `n` and is prime must be the largest prime factor — so return it. Also correct! And the `return null` covers "no factor found" (only possible for inputs below 2).

```js
console.log(largestPrimeFactor(13195));   // 29 — instant, looks fine!
console.log(largestPrimeFactor(600851)); // still okay...
```

Small demos that work instantly — which is exactly what makes the trap invisible.

## 4. What's wrong with it (in beginner terms)

Here's the unsettling part: **there is no bug.** Every answer this program gives is right. The flaw is *how many steps* it takes.

**Problem 1: `isPrime` tries every number below x.** To check whether 599,999,999,981 is prime, it does roughly 600 billion divisions. A computer does maybe a billion of those per second — so that's ten minutes. *For one candidate.*

**Problem 2: the outer loop starts at the top.** `largestPrimeFactor(600851475143)` begins by asking about 600851475143, then ...142, then ...141 — calling `isPrime` on billions of numbers that aren't even factors. The two problems multiply together: billions of candidates × up to billions of checks each.

How this bites you later: you test with cute inputs, everything's instant, you ship it. A month later someone feeds it a real-world-sized input and the program just... sits there. No error, no crash, fan spinning. You can't even tell if it's broken or thinking. "Correct" and "usable" are different bars, and only a step-count habit — "roughly how many times does this loop run?" — catches it *before* shipping.

The README's other point: the temptation is to *tune* the slow idea (skip even numbers, cache results). That earns you 2× on something that needed 1,000,000×. The real fix deletes the expensive part entirely.

## 5. Try it yourself first!

Try to make `largestPrimeFactor(600851475143)` fast. Hints, vaguest first:

1. Instead of *searching* for prime factors, could you *peel* factors off `n` one at a time?
2. What happens if you divide out every 2 from `n` (keep dividing while `n % 2 === 0`), then every 3, then try 4, 5, ...? Why can 4 never divide at that point?
3. If 4 (or any non-prime) can never divide once its smaller pieces are gone... do you even need `isPrime`?
4. When can you stop trying factors? Think about factor pairs: if `remaining` still had a factor bigger than its square root, what would its partner be?
5. Loop `for (factor = 2; factor * factor <= remaining; factor++)`, with an inner `while` that divides `factor` out and remembers it as the latest (largest-so-far) factor.
6. After the loop, if `remaining` is still bigger than 1 — what must it be? (Hint: it has no factors up to its own square root.)

## 6. Understanding the refactored solution

The whole solution is one small exported function:

```js
export function largestPrimeFactor(n) {
  if (!Number.isInteger(n) || n < 2) {
    throw new RangeError(`Need an integer >= 2, got ${n}`);
  }

  let remaining = n;
  let largest = 1;

  for (let factor = 2; factor * factor <= remaining; factor++) {
    while (remaining % factor === 0) {
      largest = factor;
      remaining = remaining / factor;
    }
  }

  return remaining > 1 ? remaining : largest;
}
```

Design choices:

- **Guard clause first.** Bad input (1, 3.5, a string) throws a `RangeError` immediately. Everything after that line gets to assume clean input — no wrapping the whole body in an `if`, no `null` conventions to remember. Loud and early beats quiet and wrong.
- **Divide factors out — `isPrime` is deleted.** Watch it on 600851475143: it's odd, so 2 never divides; 3 no; ...eventually 71 divides — divide it out; then 839; then 1471; then 6857. When the loop tries 4, all the 2s are already gone, so 4 *can't* divide. Same for 6, 8, 9... Any factor that *does* divide must be prime, automatically. The expensive question ("is this prime?") is never asked, because the process makes it unnecessary.
- **Stop at `factor * factor <= remaining`.** Factors pair up around the square root, so past it there's nothing new. And note it checks `remaining`, not `n` — every division shrinks `remaining`, so the finish line *moves closer* as you run. For the Euler number, after dividing out 71 × 839 × 1471, remaining is 6857 and the loop only needs to reach 82.
- **The last line handles the leftover.** After the loop, `remaining` is either 1 (everything got divided out — answer is `largest`) or one final prime bigger than its own square root — like the 6857 — which is then the largest factor. The `condition ? a : b` form is the **ternary operator**: a one-line if/else that picks a value.

**The tests** (`prime-factor.test.js`) check small composites (6 → 3, 13195 → 29), primes returning themselves (97 → 97), powers of two (1024 → 2 — the "everything divided out" path), and bad inputs throwing. The headline test is `largestPrimeFactor(600851475143) === 6857`: since the test suite finishes instantly, the performance claim is *proven every run*, not promised in a comment. The original could never pass that test — it wouldn't finish.

## 7. Words you learned (glossary)

- **Factor / divisor** — a number that divides another evenly (remainder 0).
- **`%` (modulo)** — operator giving the remainder of a division.
- **Prime number** — a whole number ≥ 2 whose only factors are 1 and itself.
- **Prime factor** — a factor that is also prime; every number ≥ 2 is a unique product of them.
- **`for` loop** — repeats code with a counter (start; condition; step).
- **`while` loop** — repeats code as long as a condition stays true.
- **Nested loops** — a loop inside a loop; their step counts multiply.
- **Big-O / step counting** — estimating roughly how many operations code performs.
- **Square-root trick** — any number with a factor has one ≤ its square root, so searches can stop there (`factor * factor <= n`).
- **Guard clause** — an early check that rejects bad input before the real work.
- **`throw`** — stop the function and report an error to the caller.
- **`RangeError`** — built-in error type: right kind of value, out-of-range value.
- **`Number.isInteger`** — true only for whole numbers.
- **Ternary operator (`? :`)** — one-line if/else that produces a value.
- **Module / `export` / `import`** — a file sharing functions with other files.
- **Assertion / `assert.equal` / `assert.throws`** — automatic checks inside tests.
- **`node --test`** — Node's built-in command to run test files.

## 8. Experiments to try on the plane (no internet needed)

1. **Feel the slowness safely.** In `original.js`, try `largestPrimeFactor(600851475)` (three digits shorter than the scary one). Expected: a noticeable pause — seconds, not instant — before the answer prints. Then try the same number in the refactored version: instant. (Don't uncomment the full 600851475143 in the original unless you enjoy force-quitting.)
2. **Count the work.** Add a global `let steps = 0;` to `original.js`, add `steps++` inside `isPrime`'s loop, and print `steps` after `largestPrimeFactor(13195)`. Expected: tens of thousands of steps for a five-digit input. The refactored version, instrumented the same way inside the `while`, does it in a handful.
3. **Break the square-root trick.** In the refactored file, change the loop condition to `factor <= remaining`. Expected: still correct (run the tests!) — but the Euler test gets slower. Correctness and speed are separate dials.
4. **Trace it by hand.** On paper, run the refactored algorithm on 60: divide out 2s (60→30→15), 3 (15→5), loop stops (4×4 > 5), remaining 5 > 1 → answer 5. Then verify: 60 = 2×2×3×5. ✔
5. **Trigger the guard.** Call `largestPrimeFactor(1)` and `largestPrimeFactor(3.5)` in a scratch file. Expected: `RangeError: Need an integer >= 2, got 1` — the program refuses instead of looping forever or lying.
