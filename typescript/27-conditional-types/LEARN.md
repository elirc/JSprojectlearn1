# 📘 Learning Guide: Conditional Types

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code is a small caching layer: "compute this value once, remember it under a key." Some computations are synchronous (return a value now); some are asynchronous (return a `Promise` — a value later).

The original author couldn't express "unwrap the Promise if there is one" in types, so they wrote *two* nearly identical functions — and left a trap: pass an async function to the *sync* getter and you get a Promise disguised as a plain value. `user.name` is `undefined`, and the compiler smiled the whole time.

The missing tool is the **conditional type**: `T extends U ? X : Y` — an if/else that runs on types. With its partner `infer`, it can take a type *apart*: "if T is a Promise of something, give me that something."

## 2. Concepts you need first

### 2.1 Promises — values that arrive later

A `Promise<T>` is JavaScript's "I'll have a `T` for you later" object. You get the value out with `await` (inside an `async` function) or `.then(...)`:

```ts
async function getName(): Promise<string> {
  return 'Ada';
}
const later = getName();      // later: Promise<string> — NOT a string
const name = await getName(); // name: string  (inside an async function)
```

Critical detail: an `async` function *always* returns a Promise, even if its body looks like it returns a plain object. `async () => ({ name: 'Ada' })` returns `Promise<{ name: string }>`.

### 2.2 Generic functions and inference

(Explained fully in exercise 16's LEARN.md.) When you call `getCached('k', () => 42)`, TypeScript *infers* `T = number` from the function you passed. Inference reads your arguments and fills in the blanks — including blanks you wish it hadn't, as we'll see.

### 2.3 Conditional types — if/else for types

The syntax is `T extends U ? X : Y`. Read it: "if type `T` is assignable to type `U`, the result is `X`; otherwise `Y`."

```ts
type IsString<T> = T extends string ? 'yes' : 'no';
type A = IsString<'hello'>; // 'yes'
type B = IsString<42>;      // 'no'
```

Here `extends` means "fits into / matches," not class inheritance. `'hello' extends string` is true because every `'hello'` is a string.

### 2.4 `infer` — capture a piece of the pattern

Inside a conditional's `extends` clause, `infer X` means "if the shape matches, name this part `X` so I can use it." Think of it as a capture group in a regular expression, but for types:

```ts
type ElementOf<T> = T extends Array<infer E> ? E : never;
type A = ElementOf<string[]>; // string
type B = ElementOf<number[]>; // number
```

"If `T` is an array of *something*, call that something `E` and return it."

The exercise's one-liner:

```ts
type Unwrap<T> = T extends Promise<infer Inner> ? Inner : T;
type A = Unwrap<Promise<string>>; // string — unwrapped
type B = Unwrap<number>;          // number — passed through unchanged
```

### 2.5 Recursive conditional types

A conditional type can refer to itself. That turns "unwrap one layer" into "keep unwrapping until done":

```ts
type DeepUnwrap<T> = T extends Promise<infer Inner> ? DeepUnwrap<Inner> : T;
type D = DeepUnwrap<Promise<Promise<boolean>>>; // boolean
```

This is the spirit of the built-in `Awaited<T>` type.

### 2.6 Mapped types (from exercise 25) — quick recap

`{ [K in keyof T]: F<T[K]> }` loops over keys and transforms each value type. This exercise *combines* that loop with a conditional: apply `Unwrap` to every value in a table. Loops + conditionals = a small programming language over types.

### 2.7 `declare` — a type-only declaration

`declare function f(...): ...` tells TypeScript "this function exists somewhere; here's its type" without providing a body. The repo uses it for examples where only the *types* matter.

## 3. Walking through the original code

The twins:

```ts
export function getCachedSync<T>(key: string, compute: () => T): T {
  void key;
  return compute();
}

export function getCachedAsync<T>(key: string, compute: () => Promise<T>): Promise<T> {
  void key;
  return compute();
}
```

Two functions that differ only in Promise-wrapping. (`void key;` just means "I'm intentionally not using this parameter yet" — it silences the unused-variable warning.) Every call site must pick the right twin.

The trap:

```ts
export const user = getCachedSync('user', async () => ({ name: 'Ada' }));
```

An *async* compute passed to the *sync* getter. Does it error? No! Inference is happy to solve it: `compute` returns `Promise<{name: string}>`, so `T = Promise<{name: string}>`, and `user` is typed... as that Promise. But the author *believes* `user` is the cached user object. `user.name` is `undefined` (Promises have `.then`, not `.name`). Compiles perfectly; lies completely.

The second symptom — a hand-mixed table:

```ts
interface Endpoints {
  '/config': { theme: string };
  '/user': Promise<{ name: string }>;   // some entries are promises,
  '/stats': { visits: number };          // some aren't
}
```

The team wants to write "the *resolved* type of endpoint K" — unwrap if wrapped, pass through if not. Without conditional types, that sentence has no spelling, so the table stays inconsistent and every consumer copes by hand.

## 4. What's wrong with it (in beginner terms)

**Bug story — caching a Promise as a value.** The app boots, calls `getCachedSync('user', async ...)`, and stores the result. A profile page renders `Hello, {user.name}!` — which displays `Hello, undefined!`. Worse, the *cache now permanently holds a Promise* where a value should be, so every consumer breaks the same way. The compiler never objected, because `T` happily inferred as `Promise<...>`. The types didn't lie exactly — they just let the author's *assumption* ("sync getter returns plain values") go unchecked.

**Design smell — parallel everything.** Two functions to maintain, two names to remember, and every call site carries the burden of choosing. When a type-level idea ("unwrap if wrapped") can't be expressed, the duplication spreads to every function that touches it.

**The table.** `'/user'` is wrapped, its neighbors aren't. Every consumer of `Endpoints` must know which entries need `await`-ing at the type level. One wrong guess = another Promise-as-value bug.

## 5. Try it yourself first!

1. **Vague hint:** the sentence you need is "if T is a Promise of something, that something; else T itself." TypeScript can say if/else about types — what's the syntax?
2. **Warmer:** start with `type Unwrap<T> = T extends ??? ? ??? : T;`. The pattern to match is `Promise<` something `>`. How do you *name* the something? (Section 2.4.)
3. **Warmer still:** for the table, you already know a "loop over keys" from exercise 25. Loop over `keyof Endpoints` and apply your `Unwrap` to each value.
4. **Think about the twins:** do you even need two cache functions? What happens if a single `getCached<T>` just lets `T` be whatever `compute` returns — including a Promise, *typed as a Promise*?

## 6. Understanding the refactored solution

The sentence, spelled:

```ts
export type Unwrap<T> = T extends Promise<infer Inner> ? Inner : T;
```

Two mechanisms in one line: the conditional (`extends ? :`) branches on whether `T` matches the pattern, and `infer Inner` captures what's inside the Promise. `Unwrap<Promise<string>>` is `string`; `Unwrap<number>` is `number`, passed through.

Note the subtlety shown by `type C`: `Unwrap<Promise<Promise<boolean>>>` is `Promise<boolean>` — one layer only. The recursive `DeepUnwrap` keeps going until no Promise remains.

The twins became one function:

```ts
export function getCached<T>(key: string, compute: () => T): T {
  void key;
  return compute();
}
```

Here's the honest part worth staring at: the fix is *not* "magically unwrap the Promise." A sync function *cannot* unwrap a Promise (the value hasn't arrived yet!). The fix is honesty: pass an async compute, and you get back something *typed as* `Promise<{name}>`. The original's trap — a Promise typed as a value — can no longer be expressed. `userPromise.name` is now a compile error; `userPromise.then((u) => u.name)` is visibly correct.

The table, normalized with a mapped + conditional combo:

```ts
export type Resolved = { [K in keyof Endpoints]: Unwrap<Endpoints[K]> };
```

Loop over each endpoint; unwrap where wrapped; pass through where not. Mixed table in, uniform table out — and `fetchResolved('/user')` resolves to `{ name: string }` no matter how the table spelled that entry.

When do conditionals earn their keep? Library-ish code that must adapt to whatever callers pass. In everyday app code, reach for them when you catch yourself writing parallel types or twin functions that differ only in wrapping.

## 7. Words you learned (glossary)

- **Conditional type** — `T extends U ? X : Y`: an if/else evaluated on types at compile time.
- **`extends` (in a conditional)** — "is assignable to / matches this pattern."
- **`infer`** — names a captured piece inside a conditional's pattern, like a regex capture group.
- **`Promise<T>`** — a value of type `T` that will arrive later.
- **`async` function** — a function that always returns a Promise.
- **`await`** — pauses inside an async function until a Promise resolves, yielding its value.
- **Recursive type** — a type defined in terms of itself, e.g. `DeepUnwrap`.
- **`Awaited<T>`** — the built-in deep-unwrap type for Promises.
- **Type inference** — the compiler filling in generic blanks from your arguments.
- **Mapped type** — a compile-time loop over keys (exercise 25).
- **`declare`** — declares that something exists, types only, no body.
- **`void expr;`** — evaluates and discards a value; used to mark a parameter as intentionally unused.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change, then undo it.

1. In `refactored/unwrap.ts`, add `type E = Unwrap<Promise<number[]>>;` and hover it in your editor. **Expected:** `number[]`. Then try `type F = DeepUnwrap<Promise<Promise<Promise<string>>>>;` — **Expected:** `string`, three layers deep.
2. Write your own extractor: `type ArgOf<T> = T extends (arg: infer A) => unknown ? A : never;` then `type G = ArgOf<(s: string) => void>;`. **Expected:** `G` is `string`. You just rebuilt a piece of the built-in `Parameters<T>`.
3. Break the pass-through: change `Unwrap` to `T extends Promise<infer Inner> ? Inner : never`. **Expected:** the `Resolved` table's non-Promise entries become `never`, and downstream code (like `showUser`'s neighbors if you add uses of `/config`) errors. The `: T` else-branch is doing real work.
4. Recreate the original bug against the new types: write `export const oops2: { name: string } = getCached('u2', async () => ({ name: 'Ada' }));`. **Expected:** ❌ Error — `Promise<{name}>` is not `{name}`. The compiler now catches what it used to smile at.
5. Add a fourth endpoint `'/flags': Promise<boolean[]>` to `Endpoints`. **Expected:** compiles, and hovering `Resolved` shows `'/flags': boolean[]` — the mapped + conditional combo handled it with zero extra code.
