# 📘 Learning Guide: Type Inference

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

This file is just some app configuration — a port number, an app name, some flags — plus a small function that formats a price. Nothing fancy.

The type-level problem is about *where the author wrote type annotations*. They wrote them everywhere they weren't needed (cluttering the code and creating maintenance work), and skipped the one place they were essential (a function parameter), plugging that hole with `any`. The result: noisy code AND a runtime crash the compiler was never allowed to catch. The lesson: TypeScript can figure out most types by itself — you only need to write them at the "boundaries."

## 2. Concepts you need first

### Type annotations (writing the type yourself)

An **annotation** is when you write the type by hand after a colon:

```ts
const port: number = 3000;
```

This says "port is a number." True — but redundant, as you're about to see.

### Type inference (the compiler figures it out)

**Inference** means TypeScript works out the type from the value, with no annotation:

```ts
const port = 3000;        // TypeScript KNOWS this is a number
port.toUpperCase();       // ❌ Error: 'toUpperCase' does not exist on type 'number'
```

No annotation, yet the mistake is still caught. Inferred types are checked exactly as strictly as annotated ones. If you use an editor like VS Code, hover over `port` and it shows you `number` — the compiler tells you what it inferred.

The key insight: inference reads the type *from the value on the right-hand side of the `=`*. Wherever there's a value, inference works.

### Why redundant annotations are worse than useless

If you annotate something inference already knows, you've written the same fact twice. Now a change means editing two places:

```ts
const config: { url: string } = { url: "https://x.com" };
// want to add a timeout? You must edit the annotation AND the value.
```

Without the annotation, adding a field to the object is one edit, and the type updates itself. Types you don't write can't go stale.

### Where inference CAN'T work: function parameters

A parameter has no right-hand side — there's no value to read the type from, because the value arrives later, from whoever calls the function:

```ts
function double(x) { return x * 2; }
// ❌ Error (in strict mode): Parameter 'x' implicitly has an 'any' type
```

Strict mode refuses to guess, so parameters are where annotations are *required and valuable*:

```ts
function double(x: number) { return x * 2; }  // ✅ OK
double("5");  // ❌ Error: Argument of type 'string' is not assignable to 'number'
```

### The `any` escape hatch (and why it's a trap here)

Faced with the "implicitly has an any type" error above, a lazy fix is to write the annotation `: any` — which compiles, but disables all checking on that parameter (exercise 01's whole lesson). The call `double("5")` would then compile and misbehave at runtime.

### Empty containers — the other place inference fails

An empty array gives inference nothing to work with:

```ts
const jobs = [];          // inferred as never[] — an array nothing can go into (see glossary)
const jobs2: string[] = []; // ✅ annotate to state your intent
```

### Return type annotations (a judgment call)

TypeScript can infer what a function returns. Annotating the return anyway is optional but useful for exported functions: if you accidentally change what you return, the error appears *at the function* instead of at every caller.

```ts
function label(): string {
  return 42;  // ❌ Error right here: 'number' is not assignable to 'string'
}
```

## 3. Walking through the original code

Open `original.ts`. The top is annotation noise:

```ts
const port: number = 3000;
const appName: string = 'shipit';
const isProd: boolean = false;
```

Each annotation restates what the right-hand side already says. Harmless-looking, but multiplied across a codebase it's clutter, and every one is a second copy of a fact that can drift.

```ts
const flags: string[] = ['a', 'b'].map((s: string): string => s.toUpperCase());
```

This one annotates FOUR things: the variable, the callback parameter, the callback return, and none were needed — `map` over a `string[]` already tells the compiler everything.

```ts
const config: { url: string; timeout: number } = {
  url: 'https://api.example.com',
  timeout: 5000,
};
```

Here's the two-places-for-one-fact problem in full: add a `retries` field to the object and the annotation rejects it until you edit the annotation too.

Then the flip side:

```ts
export function formatPrice(price: any): string {
  return `$${price.toFixed(2)}`;
}
```

A parameter — the one place annotation is load-bearing — got `any`. Now `formatPrice("12")` compiles fine and crashes at runtime: strings don't have a `.toFixed` method, so JavaScript throws `price.toFixed is not a function`.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — noise.** The annotations on `port`, `appName`, `flags`, etc. do nothing inference wouldn't do. They make the code harder to read and create double bookkeeping: one fact (the type), two places to maintain it (annotation + value).

**Flaw 2 — the annotation that can lie.** The `config` annotation must be manually kept in sync with the object. Inference can never be out of sync with the value, because it comes *from* the value. Hand-written annotations rot; inferred types can't.

**Flaw 3 — the crash.** Here's the runtime story: another part of the app reads a price out of a text input. Text inputs give you strings. Someone calls `formatPrice("12")`. Because the parameter is `any`, the compiler approves. In production, the app throws `TypeError: price.toFixed is not a function` and the page dies. One properly-annotated parameter — `price: number` — would have made that call a compile error weeks earlier.

The irony the README points out: the author spent effort annotating twelve places that didn't need it, and skipped the one that did.

## 5. Try it yourself first!

1. **Vague hint:** There are two opposite problems in this file. One is too much of something, one is too little. Find both.
2. **Warmer:** For every annotation, ask "is there a value on the right-hand side the compiler could read this from?" If yes, the annotation is deletable.
3. **Warmer still:** Which declaration in this file has NO value to infer from? (Hint: it's inside a function's parentheses.)
4. **Specific:** Delete the annotations from all the `const` declarations (hover them in an editor to confirm the types survive). Then change `price: any` to the type it should be.
5. **Check yourself:** After your fix, `formatPrice("12")` should be a compile error. Is it?

## 6. Understanding the refactored solution

Open `refactored/inference.ts`. The rule in one line: **annotate the boundaries, infer the middles.**

**Locals lost their annotations:**

```ts
const port = 3000;
const flags = ['a', 'b'].map((s) => s.toUpperCase());
```

Everything is still fully typed — `number`, `string[]` — just inferred. Even `s` in the callback is inferred: `map` on a string array must pass strings to the callback, so the compiler fills it in. The `config` object's type now follows the value automatically: adding a field is one edit.

**The parameter got a real type:**

```ts
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
```

Parameters are annotated because nothing exists to infer from. The return type `: string` is annotated *by choice* — it's exported, and pinning the return type means mistakes error at the definition, not at callers.

**The empty container is annotated:**

```ts
export const pendingJobs: string[] = [];
```

An empty array is the other inference dead-end — without the annotation it becomes `never[]`, an array that rejects everything you try to push.

**The type test:**

```ts
// @ts-expect-error — the original's crash, now caught: strings don't format
formatPrice('12');
```

The original's runtime crash is now a permanent compile-time test: if anyone ever loosens `price` back to `any`, this line would start compiling, the `@ts-expect-error` would be flagged as unused, and the build would fail.

The mental model that decides every case: **"Is there a value here to infer from?"** Value exists (initializers, callbacks) → let inference flow. No value (parameters, empty collections) → annotate.

## 7. Words you learned (glossary)

- **Type annotation** — a type you write by hand: `const x: number = 1`.
- **Type inference** — the compiler deducing a type from a value: `const x = 1` is `number`.
- **Strict mode** — compiler setting that (among other things) refuses to silently guess `any` for parameters.
- **Implicit `any`** — the error you get when a parameter has no annotation in strict mode.
- **Boundary** — places where types can't be inferred and must be declared: function parameters, exported APIs, empty containers.
- **`never[]`** — the type of an empty array with no annotation; `never` is the type with NO possible values, so nothing can be added. Annotate to fix.
- **Return type annotation** — optional pin on what a function returns; moves errors to the definition.
- **Stale annotation** — a hand-written type that no longer matches reality after code changed. Inference can't go stale.
- **Hover** — in an editor, pointing at a variable to see its (possibly inferred) type.
- **`@ts-expect-error`** — a comment asserting the next line must fail to compile.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/inference.ts`**, add a field to `config`: `retries: 3,`. Expected: ✅ no error, one edit — the inferred type grew automatically. (Try the same in `original.ts`: ❌ error, because the annotation doesn't list `retries`.)
2. **In `refactored/inference.ts`**, change `formatPrice(price: number ...)` to `price: any`. Expected: ❌ error — but not where you think! The `@ts-expect-error` above `formatPrice('12')` reports "Unused '@ts-expect-error' directive" because the bad call now compiles. The type test caught the regression.
3. **In `refactored/inference.ts`**, remove the annotation from `pendingJobs` so it reads `export const pendingJobs = [];`, then add below it: `pendingJobs.push('job1');`. Expected: ❌ error like "Argument of type 'string' is not assignable to parameter of type 'never'" — the empty array inferred `never[]`.
4. **In `refactored/inference.ts`**, change the return line of `formatPrice` to `return 42;`. Expected: ❌ error at that line — "Type 'number' is not assignable to type 'string'" — the annotated return type catches it at the definition.
5. **In `refactored/inference.ts`**, change `const port = 3000;` to `const port = '3000';`. Expected: ✅ no error in this file (the template string at the bottom happily accepts it). Lesson: inference follows the value — it's flexible, which is why *boundaries* (like function signatures) are where you pin things down.
