# 📘 Learning Guide: Type Testing

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

By this point in the track, types do real work: they model states, correlate keys, transform other types. Complicated types can have **bugs** — just like functions. So how do you *test* a type?

The original file shows the workflow most teams actually use: write a clever type, hover over an example in the editor, squint at the tooltip, ship it. This file's `DeepPartial` type has a genuine bug that "hover and squint" missed, and its `IdsOf` type produces a hover nobody can fully read. The refactor builds a tiny type-testing framework — two utilities, `Equal` and `Expect` — so that type-level claims are *asserted in code* and a regression **fails the build**. It's the capstone: tests for types, exactly like unit tests for values.

## 2. Concepts you need first

This exercise leans on the track's advanced-types run. Mapped types are explained fully in exercise 25's LEARN.md, conditional types in 27's, `infer` in 28's. Short recaps below, then the new material.

### Mapped types (recap)
A mapped type loops over a type's keys and rebuilds each property. `?` after the loop makes each property optional:

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type P = MyPartial<{ a: number; b: string }>; // { a?: number; b?: string }
```

### Optional properties and `| undefined`
Marking a property `a?: number` means it may be absent — and when you *read* it, its type is `number | undefined`. Keep this in mind: the type tests below compare against `... | undefined` for exactly this reason.

### Conditional types (recap)
A type-level if/else: `A extends B ? X : Y` — "if A is assignable to B, then X, else Y":

```ts
type IsString<T> = T extends string ? true : false;
type A = IsString<'hi'>; // true
type B = IsString<42>;   // false
```

### Recursive types
A type may use *itself* — that's how `DeepPartial` reaches into nested objects: "make each property optional; if the property is itself an object, apply DeepPartial to it too."

### The trap: arrays are objects
In JavaScript (and TypeScript), arrays ARE objects. So the check `T[K] extends object` is **true for arrays**:

```ts
type Check = string[] extends object ? 'yes' : 'no'; // 'yes'!
```

This single fact is the bug in the original's `DeepPartial`. Mapping `?` over an *array* type makes its **elements** optional — `(string | undefined)[]` — an array allowed to contain holes.

### `infer` (recap)
Inside a conditional's `extends` clause, `infer X` captures part of the matched type:

```ts
type IdOf<T> = T extends { id: infer Id } ? Id : never;
type N = IdOf<{ id: number; name: string }>; // number
```

### `never` and how unions absorb it
`never` is the empty type — no values. In a union, `never` simply vanishes: `string | never` is just `string`. Handy for "contribute nothing" — but it also means a hover can't show you whether a `never` was cleanly excluded or silently absorbed. Hovers launder `never`.

### Indexing a mapped type by `[keyof T]`
`{ ... }[keyof T]` means "take that mapped object and union together all its property types" — a standard way to collect results across keys:

```ts
type Vals = { a: number; b: string }[ 'a' | 'b' ]; // number | string
```

### The `Equal` trick (new — the heart of this exercise)
Comparing types is subtler than it looks. `A extends B ? ... : ...` only checks *one direction* (A fits in B). The standard `Equal<A, B>` idiom checks **exact** equality:

```ts
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;
```

How to read it: build two generic function types whose *bodies* mention `A` and `B`, then ask if one is assignable to the other. The compiler can only say yes when `A` and `B` are *identical* — it can't test every possible `T`, so it demands the conditional types be the same. Honest advice (the file's own comment says the same): **memorize this as a unit**. It's the standard idiom used by type-challenge repositories and type-testing libraries everywhere; you can use it for years before dissecting it.

```ts
type T1 = Equal<string, string>;          // true
type T2 = Equal<string, string | number>; // false — plain extends would say "fits"!
```

### `Expect` and the assertion tuple (new)
`Expect<T extends true> = T` only accepts the type `true`. Feed it a failed `Equal` (which is `false`) and you get a compile error *at that exact line*:

```ts
type Expect<T extends true> = T;
type _OK = Expect<Equal<1, 1>>;   // ✅ OK
type _NO = Expect<Equal<1, 2>>;   // ❌ Error: 'false' does not satisfy 'true'
```

Stack assertions in a tuple type (`type _Cases = [Expect<...>, Expect<...>]`) and every `npm run typecheck` runs your whole type test suite. No test runner needed — the compiler IS the runner.

### `@ts-expect-error` — the other half
Asserts a line must NOT compile (exercise 19's LEARN.md). Together they form the discipline: `Expect<Equal<...>>` for what must hold; `@ts-expect-error` for what must not.

## 3. Walking through the original code

```ts
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
```

Loop over `T`'s keys, make each optional; recurse into object-typed properties. Looks right. The flaw hides in `extends object` — remember, arrays pass that test.

```ts
export const looksRight: DeepPartial<Config> = {
  server: { port: 8080 }, // nested partial works! ship it.
};
```

This is the "test": declare one value, hover it, squint. It checks only the case the author thought of — nested objects. It says nothing about `tags`.

```ts
export const suspicious: DeepPartial<Config> = {
  tags: ['a', undefined, 'c'], // an array with HOLES in it
};
```

The bug, demonstrated: `tags: string[]` matched the `extends object` branch, became `DeepPartial<string[]>`, and mapping `?` over an array makes its *elements* optional — `(string | undefined)[]`. An array with holes now typechecks. "Partial" was supposed to mean "fields may be missing," never "elements may be undefined."

```ts
export type IdsOf<T> = { [K in keyof T]: T[K] extends { id: infer Id } ? Id : never }[keyof T];
```

Second clever type: for each entity, extract its `id` type (or `never` if it has none), then union everything. Intended result for the demo `Entities`: `number | string`. And the "test"? Hover `EntityId` and squint: `string | number`... but did `health` (which has no id) contribute a leaked `never` that the union silently absorbed, or was it excluded on purpose? Is `undefined` hiding in there? Hovers truncate long types, and unions launder `never` — you literally cannot tell. The next person to refactor `IdsOf` has no safety net at all.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: hover-and-squint only tests the cases you thought to hover.** The author hovered the nested-object case; it worked; they shipped. The array case was never looked at. **Runtime bug story:** a settings screen builds a `DeepPartial<Config>` patch. Some code path produces `tags: ['a', undefined, 'c']` — typechecks fine! Later, `savedConfig.tags.map((t) => t.toUpperCase())` crashes on the hole: "Cannot read properties of undefined." The stack trace points at the `.map`, which is innocent. The real culprit is a type definition written weeks earlier, in a different file, that quietly permitted holes.

**Flaw 2: hovers are unreadable evidence.** For `IdsOf`, even a careful person can't verify correctness from the tooltip — `never` disappears into unions, long types get truncated with `...`. "It looks fine" is not a test result.

**Flaw 3: no regression net.** Types get refactored like all code. Without assertions, a refactor of `DeepPartial` or `IdsOf` is checked by... re-hovering two examples and hoping. The whole track has been making types load-bearing; load-bearing code without tests is a cut rope waiting to happen.

## 5. Try it yourself first!

1. **Vague hint:** Two problems: the `DeepPartial` bug itself, and the missing safety net. Fix the bug, then write something that would have *caught* it automatically.
2. **The bug, less vague:** `T[K] extends object` is true for arrays. Add a branch *before* it that matches arrays and passes them through unchanged. `readonly unknown[]` matches all arrays.
3. **The net, less vague:** you need a type that answers "are these two types exactly equal?" and a type that errors unless given `true`. The `Equal` idiom is in section 2 above — copy it verbatim; that's what everyone does.
4. **More specific:** write `type Expect<T extends true> = T;` and then a tuple: `type _Cases = [Expect<Equal<DeepPartial<Config>['tags'], string[] | undefined>>];`. Before your fix this line should error; after the fix it should pass. That's a regression test.
5. **Don't forget the `| undefined`:** `DeepPartial` makes properties optional, so reading `['tags']` yields `string[] | undefined`. If your `Equal` returns false unexpectedly, this is usually why.
6. **For `IdsOf`:** assert its exact output: `Expect<Equal<IdsOf<Entities>, number | string>>` — and add a case proving id-less objects give `never`.

## 6. Understanding the refactored solution

The framework — two lines, total:

```ts
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true : false;

export type Expect<T extends true> = T;
```

`Equal` is `true` only for *exactly* equal types (strict enough that `Equal<string | number, string>` is `false` — and there's a meta-test asserting that!). `Expect` converts a `false` into a compile error pointing at the exact failing assertion.

The fixed `DeepPartial`:

```ts
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};
```

A new first branch: if the property is an array (readonly or not — `readonly unknown[]` matches both), keep it *whole*. Only non-array objects recurse. Arrays stay real arrays: present-or-absent, never holey.

The payoff — the tests:

```ts
type _DeepPartialCases = [
  Expect<Equal<DeepPartial<Config>['server'], { port?: number; host?: string } | undefined>>,
  Expect<Equal<DeepPartial<Config>['debug'], boolean | undefined>>,
  Expect<Equal<DeepPartial<Config>['tags'], string[] | undefined>>,
];
```

Each line is a claim, checked on every `npm run typecheck`. The third is **the regression test**: it pins "arrays stay arrays" forever — reintroduce the original bug and the build fails *on this line*, naming the exact broken claim. Note each expected type carries `| undefined` because the properties are optional.

`IdsOf` keeps its original definition but gains written-down intent:

```ts
type _IdsOfCases = [
  Expect<Equal<IdsOf<Entities>, number | string>>,
  Expect<Equal<IdsOf<{ a: { status: string } }>, never>>,
  Expect<Equal<Equal<string | number, string>, false>>,
];
```

No hover, no squint: the union is *exactly* `number | string`; id-less entries contribute `never` (asserted directly, so the union can't secretly launder anything); and the third line tests the test — `Equal` itself is strict enough to catch near-misses that plain `extends` would wave through.

Finally, `@ts-expect-error` remains the negative-space tool: the sparse-array value that exposed the bug now sits under one, guaranteed to *stay* rejected, while a normal partial (`{ server: { port: 8080 } }`) still compiles. Positive claims via `Expect<Equal<...>>`, negative claims via `@ts-expect-error` — a complete testing discipline, run by the compiler, every build.

## 7. Words you learned (glossary)

- **Type-level test**: a compile-time assertion that a type is what you claim.
- **Hover and squint**: "testing" a type by reading editor tooltips — this exercise's villain.
- **Mapped type**: a type built by looping over another type's keys (exercise 25).
- **Conditional type**: type-level if/else — `A extends B ? X : Y` (exercise 27).
- **Recursive type**: a type defined in terms of itself, for nested data.
- **`infer`**: captures part of a matched type inside a conditional (exercise 28).
- **`never`**: the empty type; vanishes inside unions.
- **`DeepPartial`**: makes every field, at every nesting level, optional.
- **Sparse array**: an array whose elements may be `undefined` — holes.
- **`Equal<A, B>`**: standard idiom returning `true` only for exactly equal types.
- **`Expect<T>`**: accepts only `true`; turns a failed `Equal` into a located compile error.
- **Assertion tuple**: a tuple type holding `Expect` entries — the test suite.
- **Regression test**: a test that pins a fixed bug so it can't quietly return.
- **`@ts-expect-error`**: asserts a line must fail to compile — the negative-space half.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change; undo afterward.

1. In `refactored/type-tests.ts`, reintroduce the bug: delete the `T[K] extends readonly unknown[] ? T[K] :` branch from `DeepPartial`. Expect: ❌ the `tags` assertion errors AND the `@ts-expect-error` over the holey array complains "Unused directive." Two nets, both catching. This is the whole exercise in one keystroke.
2. Change a test to a *near-miss*: assert `DeepPartial<Config>['tags']` equals `string[]` (drop the `| undefined`). Expect: ❌ `Equal` says false — optional properties read as `| undefined`, and `Equal` is exact.
3. Add a new test: `Expect<Equal<DeepPartial<{ a: { b: { c: number } } }>['a'], { b?: { c?: number } | undefined } | undefined>>`. Expect: ✅ — recursion goes all the way down. Then remove an `?` from your expected type and watch it fail.
4. Give an entity a `readonly id`: add `post: { readonly id: number }` to `Entities`. Expect: the `IdsOf<Entities>` assertion still passes — `infer` doesn't care about readonly. Now you know something the hover would never have told you.
5. Try `type _Bad = Expect<Equal<any, string>>;`. Expect: ❌ false — this `Equal` even distinguishes `any` from everything else, something ordinary `extends` checks famously cannot do. (This is a big reason the weird two-function idiom is the standard.)
