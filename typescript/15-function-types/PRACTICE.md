# 🏋️ Practice: Function Types

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. Nothing here needs the shipped code, but `import type { TaskResult } from './refactored/tasks.js';` works if you want it.

## Exercises

### ⭐ 1. A formatter alias (warm-up)

A text editor applies "formatters" to selected text: each one takes the text and returns new text. Write `type Formatter = (text: string) => string`, then `applyFormatter(text: string, format: Formatter): string` that runs it. Call it with an inline arrow that uppercases — and write no annotation on the arrow's parameter.

**Practices:** replacing `Function` with a real signature, and naming it once.
**Hint:** the alias is one line; the arrow at the call site needs zero type annotations because the slot supplies them.
**Check:** the uppercase call must compile with no annotation; add a `@ts-expect-error` test that catches `applyFormatter('hello', (n: number) => String(n))`, roughly `Type 'number' is not assignable to type 'string'`.

### ⭐⭐ 2. A handler whose parameter you never annotate (core)

Keyboard shortcuts: define `interface KeyEvent { key: string; ctrl: boolean; repeat: boolean }`, a `type KeyHandler` taking one `KeyEvent` and returning nothing, and `onKey(handler: KeyHandler): void` whose body invokes the handler with a sample event. Then register a handler that logs `'save'` for ctrl+S — again with a bare `(event) =>`.

**Practices:** contextual typing — declaring the function type once so every callback gets inference and typo-checking free.
**Hint:** `type KeyHandler = (event: KeyEvent) => void;` — the parameter name in the type is documentation; the type is the contract.
**Check:** the ctrl+S handler must compile un-annotated; add a `@ts-expect-error` test inside a second handler that catches `event.crtl`, roughly `Property 'crtl' does not exist on type 'KeyEvent'`.

### ⭐⭐ 3. Callbacks living inside an options object (core)

An uploader takes options: `onDone` (required, receives the finished path) and `onProgress` (optional, receives a percent). Write `interface UploadOptions` with both as function-typed properties, then `upload(name: string, options: UploadOptions): void` that reports progress and finishes. Call `upload` twice — once passing only `onDone`, once passing both.

**Practices:** function types as *properties*, and calling an optional callback safely.
**Hint:** an optional callback is `onProgress?: (percent: number) => void`, and the call needs `options.onProgress?.(0)`.
**Check:** both calls must compile; add a `@ts-expect-error` test that catches a call omitting `onDone`, and another catching `options.onProgress(0)` written without `?.`, roughly `Cannot invoke an object which is possibly 'undefined'`.

### ⭐⭐ 4. A function that returns a function (core)

Logging helpers are often built by a factory: `makePrefixer('[warn]')` gives you back a function that prepends `[warn]` to any message. Write `type Prefixer = (message: string) => string` and `makePrefixer(prefix: string): Prefixer`. Note what the returned arrow's parameter needs by way of annotation.

**Practices:** using a function type as a *return* type, and contextual typing flowing into a returned arrow.
**Hint:** because `makePrefixer` is declared to return `Prefixer`, the arrow you return can be written `(message) => ...`.
**Check:** `const line: string = makePrefixer('[warn]')('disk almost full')` must compile; add a `@ts-expect-error` test that catches calling the returned prefixer with `42`.

### ⭐⭐⭐ 5. Make the return impossible to ignore (challenge)

A checkout pipeline runs steps over a `Cart` (`items: number`, `total: number`). Written as `type CheckoutStep = (cart: Cart) => void`, a step that wants to *abort* has nowhere to say so — LEARN.md's `void` trap. Redesign it: give steps a real result type `StepResult = { ok: true } | { ok: false; reason: string }`, write two steps (empty cart, over-limit), and `runCheckout(cart, steps: readonly CheckoutStep[]): StepResult` that stops at the first failure and hands the reason back.

**Practices:** fixing a `void`-swallowed meaning by *modeling* — the README's point that some safety comes from types and some from design.
**Hint:** the loop returns early on `!result.ok`; after that check, `result.reason` is available (exercise 10's narrowing doing the work).
**Check:** the pipeline must compile and `outcome.ok ? 'accepted' : outcome.reason` must typecheck; add a `@ts-expect-error` test catching a step written as `(cart) => { console.log(cart.items); }`, roughly `Type 'void' is not assignable to type 'StepResult'`. Then prove the tolerance still runs the other way: `const sink: (cart: Cart) => void = notEmpty;` must compile.

### ⭐⭐⭐ 6. Type an untyped factory (challenge)

Here is working JavaScript with no types: `createStopwatch()` returns an object with `start()` (records the current time), `stop()` (returns elapsed milliseconds, or `null` if it was never started), and `isRunning()`. Write `interface Stopwatch` describing those three members as function-typed properties, then implement `createStopwatch(): Stopwatch` over a `let startedAt: number | null` closure variable.

**Practices:** describing a whole object of callables, and keeping the honest `| null` return that the untyped version left implicit.
**Hint:** `stop: () => number | null` — and inside `stop`, an early `if (startedAt === null) return null;` narrows the rest of the body.
**Check:** must compile cleanly; add `@ts-expect-error` tests catching `watch.start(5)` (roughly `Expected 0 arguments, but got 1`) and `watch.stop().toFixed(0)` (roughly `'watch.stop()' is possibly 'null'`).

## Solutions

### Solution 1

```ts
type Formatter = (text: string) => string;

function applyFormatter(text: string, format: Formatter): string {
  return format(text);
}

const shouted = applyFormatter('hello', (t) => t.toUpperCase());

// @ts-expect-error — a Formatter is handed a string, not a number
applyFormatter('hello', (n: number) => String(n));
```

WHY: `Function` would have accepted the number-taking arrow and let `applyFormatter` call it with anything; the alias states arity, parameter type, and return, so both sides of the contract are policed. The un-annotated `(t) =>` is the payoff described in the README — declare the function type once and every call site gets its parameters inferred. Rejecting `(n: number) => string` is TypeScript checking parameters in the strict direction: a slot promising to supply a `string` cannot be filled by a function demanding a `number`.

### Solution 2

```ts
interface KeyEvent {
  key: string;
  ctrl: boolean;
  repeat: boolean;
}

type KeyHandler = (event: KeyEvent) => void;

function onKey(handler: KeyHandler): void {
  handler({ key: 's', ctrl: true, repeat: false });
}

onKey((event) => {
  if (event.ctrl && event.key === 's') console.log('save');
});

onKey((event) => {
  // @ts-expect-error — 'crtl' does not exist on KeyEvent
  console.log(event.crtl);
});
```

WHY: this is the `onResult`/`vlaue` bug from the original, rebuilt from scratch and closed the same way. The moment `KeyHandler` names the parameter's shape, the callback's `event` is a `KeyEvent` without an annotation, so `crtl` is a red squiggle rather than an `undefined` in a log. Note the handlers return `void` while their bodies end in `console.log(...)` — the tolerance rule from LEARN.md means that's fine.

### Solution 3

```ts
interface UploadOptions {
  onProgress?: (percent: number) => void;
  onDone: (url: string) => void;
}

function upload(name: string, options: UploadOptions): void {
  options.onProgress?.(0);
  options.onProgress?.(100);
  options.onDone(`/files/${name}`);
}

upload('report.pdf', { onDone: (url) => console.log(url.toUpperCase()) });

upload('chart.png', {
  onProgress: (percent) => console.log(percent.toFixed(0)),
  onDone: (url) => console.log(url),
});

// @ts-expect-error — onDone is required
upload('notes.txt', { onProgress: () => {} });

function callWithoutGuard(options: UploadOptions): void {
  // @ts-expect-error — onProgress may be undefined; call it with ?.()
  options.onProgress(0);
}
```

WHY: functions stored in properties get the same treatment as functions in parameters — `percent` and `url` are both inferred at the call sites from the interface. Optional callbacks are where exercise 04's `?` and exercise 05's null discipline meet function types: `onProgress?: ...` means the property's type is `((percent: number) => void) | undefined`, so calling it bare is a compile error and `?.()` is the fix. Also worth noticing: `onProgress: () => {}` is accepted even though the slot supplies a `percent` — a callback may declare *fewer* parameters than it's given.

### Solution 4

```ts
type Prefixer = (message: string) => string;

function makePrefixer(prefix: string): Prefixer {
  return (message) => `${prefix} ${message}`;
}

const warn = makePrefixer('[warn]');
const line: string = warn('disk almost full');

// @ts-expect-error — the returned Prefixer still wants a string
warn(42);
```

WHY: a function type is just a type, so it works in a return position exactly as it works in a parameter position — and contextual typing flows the same way, which is why the returned arrow can be `(message) =>` with nothing annotated. Without the `Prefixer` annotation on `makePrefixer` you would still get a working inferred type here, but naming it means every factory and every consumer in the codebase points at one definition (exercise 03's rule, applied to callables).

### Solution 5

```ts
interface Cart {
  items: number;
  total: number;
}

type StepResult = { ok: true } | { ok: false; reason: string };
type CheckoutStep = (cart: Cart) => StepResult;

const notEmpty: CheckoutStep = (cart) =>
  cart.items > 0 ? { ok: true } : { ok: false, reason: 'cart is empty' };

const affordable: CheckoutStep = (cart) =>
  cart.total <= 500 ? { ok: true } : { ok: false, reason: 'over the limit' };

function runCheckout(cart: Cart, steps: readonly CheckoutStep[]): StepResult {
  for (const step of steps) {
    const result = step(cart);
    if (!result.ok) return result;
  }
  return { ok: true };
}

const outcome = runCheckout({ items: 0, total: 10 }, [notEmpty, affordable]);
const verdict = outcome.ok ? 'accepted' : outcome.reason;

// @ts-expect-error — a step must report back; a void body is not a StepResult
const silent: CheckoutStep = (cart) => {
  console.log(cart.items);
};

// the tolerance still runs the other way — this must COMPILE:
const sink: (cart: Cart) => void = notEmpty;
```

WHY: the `-5` bug in the original was never a type error, because a `void` slot is *allowed* to receive value-returning functions. The cure is to stop using a `void` slot: once `CheckoutStep` must return a `StepResult`, a step that forgets to report is rejected — and `runCheckout` cannot discard the answer, because its own return type demands one. The last two lines pin both directions of the rule: demanding a return is enforceable, ignoring one is always permitted, and it is the *design* that decides which situation you are in.

### Solution 6

```ts
interface Stopwatch {
  start: () => void;
  stop: () => number | null;
  isRunning: () => boolean;
}

function createStopwatch(): Stopwatch {
  let startedAt: number | null = null;
  return {
    start: () => {
      startedAt = Date.now();
    },
    stop: () => {
      if (startedAt === null) return null;
      const elapsed = Date.now() - startedAt;
      startedAt = null;
      return elapsed;
    },
    isRunning: () => startedAt !== null,
  };
}

const watch = createStopwatch();
watch.start();
const elapsed = watch.stop();
const label = elapsed === null ? 'not running' : `${elapsed.toFixed(0)}ms`;

// @ts-expect-error — start takes no arguments
watch.start(5);

// @ts-expect-error — stop() may be null; check before using number methods
watch.stop().toFixed(0);
```

WHY: an object full of callables is just an interface whose properties happen to be function types, and each one carries its own arity and return contract — which is why `watch.start(5)` fails where a `Function`-typed member would have shrugged. The `number | null` return is the interesting design choice: the untyped original returned `undefined` for "never started" and callers found out at runtime, while the annotated version forces the `elapsed === null` check before `.toFixed`. Inside `stop`, the early `return null` narrows `startedAt` to `number` for the rest of the body, so the subtraction needs no assertion.
