# 📘 Learning Guide: Function Types

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A tiny task scheduler: `runTask` runs a function you hand it, `onResult` calls your callback with a result object, and `saveScore` validates scores while a loop feeds it numbers.

The type-level problem: in this code, *functions travel as values* — passed into other functions, stored, called later. Values need types, and functions are no exception. The original types its traveling functions as `Function` and `any`, which is like typing all your data as `any`: everything compiles, nothing is promised, and three different bugs walk straight through.

## 2. Concepts you need first

### Functions are values (JavaScript refresher)

In JavaScript you can put a function in a variable, pass it as an argument, or return it. A function passed into another function to be called later is a **callback**:

```ts
function greet() { console.log('hi'); }
function twice(fn) { fn(); fn(); }   // fn is a callback
twice(greet);
```

Since functions are values, TypeScript can (and should) describe their shape.

### Function type expressions — the shape of a callable

A **function type** describes parameters and return, arrow-style:

```ts
type Task = () => void;                    // takes nothing, returns nothing
type Adder = (a: number, b: number) => number;

const add: Adder = (a, b) => a + b;        // ✅ OK
const bad: Adder = (s: string) => 0;       // ❌ Error: wrong parameter type
```

Read `(a: number, b: number) => number` as "a function you may call with two numbers, which gives back a number." The parameter *names* in the type are documentation only; the types are the contract.

### Type aliases for functions (naming the shape)

`type Task = () => void` is a **type alias** — a name for a type. Exercise 03's rule ("shapes used twice get names") applies to function shapes too: name the recurring signature once, and every user refers to the name.

### The `Function` type — the `any` of callables

TypeScript has a built-in type literally called `Function`. It means "some function, no idea what it takes or returns." Any call, with any arguments, is allowed:

```ts
function run(f: Function) {
  f('surprise', 42);       // ✅ compiles — no matter what f really needs
}
run((a: number, b: number) => a + b);  // ✅ compiles; gets garbage args
```

`Function` is to callables what `any` is to values: the checking off-switch. Avoid it; write the real signature.

### `void` — "the return will not be looked at"

`void` as a return type means the function isn't expected to produce a usable value:

```ts
type Logger = (msg: string) => void;
```

One subtlety that this exercise turns into a plot point: a slot expecting `() => void` **accepts** a callback that returns more:

```ts
const t: Task = () => 42;   // ✅ OK — surprising but deliberate!
```

Why? So that patterns like `list.forEach(save)` work even when `save` happens to return something. `void` means "the caller promises to ignore the return," NOT "you may not return anything." Consequence: if a function's return value is *meaningful* (say, `false` = rejected), handing it to a return-ignoring slot compiles fine — and the meaning silently evaporates. The compiler cannot catch that one; you have to.

### Contextual typing — inference flowing backwards into callbacks

When you write a callback in a slot whose type is known, TypeScript types the callback's parameters *for* you:

```ts
type Handler = (n: number) => void;
function on(h: Handler) {}

on((n) => n.toFixed(2));   // ✅ n is number — no annotation needed!
on((n) => n.toUpperCase()); // ❌ Error: 'toUpperCase' not on number
```

This is called **contextual typing**: the context (the slot's declared type) supplies the parameter types. It's why typing the function type ONCE pays off at every call site — callbacks get checked and autocompleted with zero annotations.

### `forEach` vs `filter` (JavaScript refresher)

`arr.forEach(fn)` calls `fn` on each element and **ignores** every return value. `arr.filter(fn)` calls `fn` on each element and keeps the elements where `fn` returned `true` — the returns become data.

## 3. Walking through the original code

Open `original.ts`. First offender:

```ts
export function runTask(name: string, task: Function): void {
  console.log(`running ${name}`);
  task('surprise', 42); // calls with whatever; Function can't object
}
```

`task: Function` accepts any function — and permits any call. The body invokes every task with `('surprise', 42)`, and nothing objects. Then the call sites:

```ts
runTask('cleanup', () => console.log('cleaning'));       // fine by luck
runTask('add', (a: number, b: number) => a + b);          // silently ('surprise', 42)
runTask('oops', 'not even a function' as any);            // compiles; crashes
```

The adder receives a string and a number and computes `'surprise42'` — silently. The third line isn't even a function; `as any` launders it past `Function`, and calling it throws at runtime.

Second offender:

```ts
export function onResult(callback: any): void {
  callback({ ok: true, value: 99 });
}
onResult((result: any) => {
  console.log(result.vlaue); // typo: undefined. any said "sure".
});
```

`callback: any` means the handler's parameter shape is a guess — so the caller guesses `any` too, and `result.vlaue` (typo for `value`) compiles and prints `undefined`.

Third offender, the `void` trap:

```ts
export function saveScore(score: number): boolean {
  return score >= 0; // false = rejected!
}
scores.forEach(saveScore);
```

`saveScore` returns a *meaningful* boolean. `forEach` expects a `(x) => void` callback and ignores all returns. This compiles — legitimately, per the `void` rule above — and the `-5` rejection vanishes without a trace.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — `Function` promises nothing, so nothing is checked.** Runtime story: the "add" task was written to take two numbers. The scheduler calls it with `('surprise', 42)`. No crash — JavaScript happily computes `'surprise42'` — just a task that has never once done its job. And `'not even a function'` crashes with "task is not a function" the first time the scheduler runs it, in production, because `Function` + `as any` let a *string* enroll as a task.

**Flaw 2 — `any` callbacks make typos invisible.** The `onResult` handler reads `result.vlaue`. With a typed callback, that's a red squiggle before you even save the file. With `any`, it's `undefined` printed to a log, and someone spends an afternoon wondering why the value column is empty.

**Flaw 3 — a meaningful return fed to a return-ignoring slot.** `saveScore(-5)` returns `false` — "rejected!" — and `forEach` throws that answer away. No error ever, by design. The scores list contains an invalid entry and every count downstream is off by one. The fix isn't a type trick; it's *modeling*: route rejections somewhere they can't be ignored.

## 5. Try it yourself first!

1. **Vague hint:** Three functions receive or pass functions. For each, write down in English: what should this function take, and what should it return? That sentence *is* the type.
2. **Warmer:** Replace `task: Function` with a real function type. A task takes nothing and returns nothing — spell that. What happens to `task('surprise', 42)`? To the `'add'` call site?
3. **Warmer still:** For `onResult`: define an interface for the result (`ok`, `value`), then a named alias `type ResultHandler = (result: TaskResult) => void`. Delete the `: any` from the caller's arrow function and hover `result`.
4. **Specific:** For the scores: replace `forEach(saveScore)` with something that *keeps* the answers — e.g. `filter` to collect the rejected scores into a variable. Rejections should become data you can see.
5. **Check yourself:** After your fix, the wrong-arity adder, the string-as-task, and the `vlaue` typo should all be compile errors — and the `-5` should be visible in some output.

## 6. Understanding the refactored solution

Open `refactored/tasks.ts`.

**Real signature, named:**

```ts
export type Task = () => void;

export function runTask(name: string, task: Task): void {
  console.log(`running ${name}`);
  task(); // the only call the type allows
}
```

Two things changed: outsiders can only pass zero-argument functions, and the *body* can only call `task()` with zero arguments. Function types constrain both sides of the contract. The old bad call sites are now type tests — wrong arity rejected, non-function rejected, no `as any` laundering possible.

**Contextual typing pays off:**

```ts
export type ResultHandler = (result: TaskResult) => void;

onResult((result) => {
  console.log(result.value);
});
```

The call site writes `(result) =>` with no annotation, and `result` *is* `TaskResult` — the declared `ResultHandler` slot supplied the type. The `vlaue` typo is now a compile error (pinned in the type tests). Type the function type once; every callback against it gets inference free.

**Rejections as data:**

```ts
export const rejected = scores.filter((score) => !saveScore(score));
// [-5]
```

`filter` *consumes* the boolean instead of discarding it, so the rejected scores land in a visible array. The long comment in the file explains why `forEach(saveScore)` compiled at all: `void` slots accept value-returning callbacks by design. The compiler was never going to save you here — the fix is choosing an iteration tool whose contract matches the data. That's the exercise's deepest lesson: some safety comes from types, some from modeling.

## 7. Words you learned (glossary)

- **Callback** — a function passed to another function, to be called later.
- **Function type** — a type describing a callable: `(params) => returnType`.
- **Type alias** — a name for a type (`type Task = () => void`).
- **`Function` (the type)** — "some function, no promises"; the `any` of callables. Avoid.
- **Arity** — how many parameters a function takes.
- **`void`** — a return type meaning "the caller will not look at the return."
- **The `void` tolerance rule** — `() => void` slots accept callbacks returning more; the return is ignored, not forbidden.
- **Contextual typing** — parameter types flowing from a declared slot into the callback you write there, no annotations needed.
- **`forEach` / `filter`** — array methods; the first ignores callback returns, the second turns them into kept/dropped decisions.
- **`as any`** — an assertion that launders any value past any check (see exercise 14).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/tasks.ts`**, change `runTask`'s body to `task('surprise')`. Expected: ❌ "Expected 0 arguments, but got 1" — the type polices the body's call, not just the caller's function.
2. **In `refactored/tasks.ts`**, change the alias to `type Task = () => number;` . Expected: ❌ the `'cleanup'` call site fails — `console.log(...)` returns `void`, not `number`. A demanded return is enforced; contrast experiment 3.
3. **In `refactored/tasks.ts`** (alias back to `() => void`), pass `runTask('sneaky', () => 42)`. Expected: ✅ compiles — the `void`-tolerance rule in action. The 42 is silently discarded. This is the one hole types leave open; say it out loud once so you'll recognize it.
4. **In `refactored/tasks.ts`**, in the `onResult` call, annotate the callback as `(result: { ok: boolean }) => ...`. Expected: ✅ compiles! A callback may declare it needs *less* than it's given (extra fields just go unused). Then try `(result: string) => ...`. Expected: ❌ incompatible — less is fine, *different* is not.
5. **In `refactored/tasks.ts`**, change `filter` back to `scores.forEach(saveScore);`. Expected: ✅ compiles cleanly — proving the README's point that the `-5` bug was never a type error. Types catch shape mismatches; only modeling catches meaning mismatches.
