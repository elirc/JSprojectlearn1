# 📘 Learning Guide: Deep Utility Types

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

`Partial<T>` makes a type's fields optional — one level deep. Every codebase eventually wants a **deep** version for config patches, test fixtures and partial updates, and every codebase writes the same three lines:

```ts
type DeepPartialBad<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartialBad<T[K]> : T[K];
};
```

It looks right. It handles the case you tested. And it breaks on arrays, tuples, functions and `Date` — four separate ways, all of which *compile*, which means the damage shows up as runtime crashes in code that never mentions `DeepPartial` at all.

The reason is a single wrong question: `T[K] extends object`. In TypeScript, `object` means "not a primitive," and *everything* that isn't a primitive answers yes. Recursive types need a base case, and this one's base case is far too narrow.

This exercise fixes `DeepPartial`, writes `DeepReadonly` alongside it, and pins both with type tests — one per failure mode, so the family of bugs can't come back.

## 2. Concepts you need first

### 2.1 `object` is not "a plain object"

```ts
type IsObj<T> = T extends object ? true : false;

type A = IsObj<{ a: 1 }>;              // ✅ true — as expected
type B = IsObj<string[]>;              // ✅ true (!) arrays are objects
type C = IsObj<[number, number]>;      // ✅ true (!) so are tuples
type D = IsObj<() => void>;            // ✅ true (!) so are functions
type E = IsObj<Date>;                  // ✅ true (!) so is every class instance
type F = IsObj<string>;                // false — only primitives say no
```

`object` is "anything you can attach a property to." Using it as "is this a plain data object?" is the bug at the root of this exercise.

### 2.2 Homomorphic mapped types preserve the container

A mapped type written as `{ [K in keyof T]: ... }` — mapping over `keyof T` directly — is called **homomorphic**, and TypeScript gives it a special power: applied to an array or tuple, it maps the *elements* and keeps the container.

```ts
type Wrap<T> = { [K in keyof T]: T[K] };

type G = Wrap<string[]>;            // ✅ string[] — still an array
type H = Wrap<[number, string]>;    // ✅ [number, string] — still a 2-tuple
type I = Wrap<{ a: number }>;       // ✅ { a: number }
```

This is enormously useful — it's how the refactor recurses into `User[]` without destroying the array — and it's also the mechanism behind flaws 1 and 2, because the modifiers you add ride along onto the elements:

```ts
type Optionalize<T> = { [K in keyof T]?: T[K] };
type J = Optionalize<string[]>;     // (string | undefined)[] — HOLES
type K = Optionalize<[number, number]>; // [(number | undefined)?, (number | undefined)?]
```

Adding `?` to an array's "keys" makes its *elements* optional. That's the sparse array in flaw 1, in two lines.

### 2.3 `keyof` a function type is `never`

```ts
type L = keyof ((event: string) => void); // never
type M = { [K in keyof ((event: string) => void)]: string }; // {}
```

A function type has a *call signature*, not properties — and mapped types only copy properties. So mapping over a function returns `{}` and the callability is gone. That's flaw 3.

### 2.4 `{}` accepts almost everything

```ts
const a: {} = 42;                 // ✅
const b: {} = 'hello';            // ✅
const c: {} = { anything: true }; // ✅
const d: {} = null;               // ❌ Error — only null and undefined are rejected
```

`{}` means "not null or undefined". Combined with 2.3, that's why `{ onSave: 42 }` compiles in the original: `onSave`'s type became `{}`, and `42` fits.

### 2.5 A type with all-optional properties is satisfied by `{}`

```ts
type AllOptional = { getTime?: () => number; toISOString?: () => string };
const e: AllOptional = {}; // ✅ nothing is required
```

Mapping `?` over `Date` produces exactly this — every method optional — so `{}` becomes a valid `Date`. That's flaw 4, and it's the most dangerous of the four because `createdAt` *looks* fully typed at the use site.

### 2.6 Conditional types distribute over unions

```ts
type Boxed<T> = T extends string ? T[] : T;
type N = Boxed<string | number>; // string[] | number
```

A conditional type with a naked type parameter runs once per union member. Here that's what you want — `DeepPartial<string | { a: 1 }>` should treat each member on its own merits — but it's worth knowing it's happening, especially when a type "mysteriously" returns a union.

### 2.7 Matching any function without saying `Function`

```ts
type AnyFunction = (...args: never[]) => unknown;
type O = ((a: string, b: number) => void) extends AnyFunction ? true : false; // ✅ true
```

Parameters are **contravariant**: a function accepting `(a: string, b: number)` is assignable to one accepting `never`s, because `never` is assignable to everything. And any return type is assignable to `unknown`. So this two-word type matches every function, without the `Function` type's well-known looseness.

### 2.8 Order matters in a conditional chain

Just like `if / else if`, the branches of a nested conditional are tried in order. `Date` must be checked **before** "is this an object?", or the object branch swallows it. The refactor's order — atomic, then array-shaped, then plain object — is the whole design.

## 3. Walking through the original code

```ts
export type DeepPartialBad<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartialBad<T[K]> : T[K];
};

export interface Config {
  server: { port: number; host: string };
  tags: string[];
  point: [number, number];
  onSave: (event: string) => void;
  createdAt: Date;
  debug: boolean;
}
```

The case it was written for works: `{ server: { port: 8080 } }` is accepted, nested and partial. Then the four flaws, in file order:

- `sparse` — `tags` matched `extends object` (2.1), so it recursed; the homomorphic map carried the `?` onto the elements (2.2); `['a', undefined, 'c']` is now legal.
- `brokenPoint` — the same, applied to `[number, number]`, so a fixed-length pair became a pair of maybes.
- `notAFunction` — `onSave` matched `extends object`, mapping produced `{}` (2.3), and `42` fits `{}` (2.4). A number in a callback slot.
- `notADate` — `createdAt` mapped over `Date`'s methods, all optional, so `{}` satisfies it (2.5). An empty object is a valid `Date`.

And `applyPatch` spreads the patch onto a real `Config`, so all four pieces of garbage land in an object the rest of the app trusts completely.

## 4. What's wrong with it (in beginner terms)

**Bug story 1 — the hole in the tags.** A settings form sends `{ tags: ['a', undefined, 'c'] }` because one input was left blank. It type-checks. It merges. Three screens later `config.tags.map(t => t.toUpperCase())` throws on element 1, and the stack trace points at a component that has nothing to do with settings.

**Bug story 2 — the callback that was a number.** A migration script writes `{ onSave: 42 }` by accident (a column index, pasted into the wrong field). The compiler accepts it because `onSave`'s deep-partial type is `{}`. The app runs fine until someone saves, and then `config.onSave is not a function` — from a config file that "passed type-checking."

**Bug story 3 — the empty Date.** A test fixture builder emits `{ createdAt: {} }` for records with no timestamp. Perfectly legal, per the type. Every call to `createdAt.getTime()` in every test using that fixture throws — and the fixture is *shared*, so the failure appears in twenty unrelated suites at once.

**Why this is worse than an ordinary bug:** a broken utility type is used *everywhere*. A wrong function affects its callers; a wrong type affects every file that touches the shape. It's the highest-leverage place in a codebase to be careless, which is why ts#42 argues type tests belong here first.

## 5. Try it yourself first!

1. **Vague hint:** the recursion has a base case (`T[K] extends object ? recurse : stop`). What exactly does `object` include? Write `type Test = string[] extends object ? true : false` and see. (Section 2.1.)
2. **Warmer:** list the categories that must *not* be recursed into. Primitives, obviously — what else? (Run the four flaw examples in `original.ts` and let each failure name a category.)
3. **Warmer still:** write `type Atomic = ...` as a union of everything to copy whole, then start `DeepPartial<T>` with `T extends Atomic ? T : ...`. Order matters (2.8) — atomic must come first.
4. **The interesting branch:** arrays and tuples still need recursing *into* (`User[]` → `{ id?: number }[]`) but must not become optional. What does a homomorphic mapped type do to an array if you leave the `?` off? (Section 2.2 — try it.)
5. **Then `DeepReadonly`:** the same leaf list, but ask whether it needs three branches or two. (Hint: what does `{ readonly [K in keyof T]: ... }` do to `string[]`?)
6. **Finally, pin it.** Copy `Equal` and `Expect` from ts#42 and write one assertion per category — array, tuple, function, Date, nested object, primitive. That block is what makes the fix permanent.

## 6. Understanding the refactored solution

The leaf list first, because it's the design:

```ts
export type Primitive = string | number | boolean | bigint | symbol | null | undefined;
export type AnyFunction = (...args: never[]) => unknown;
export type Atomic = Primitive | AnyFunction | Date | RegExp | Error;
```

Explicit, greppable, and extensible: a codebase using `Map` and `URL` adds them here, once. `AnyFunction` is section 2.7's trick.

Then the three questions, in order:

```ts
export type DeepPartial<T> = T extends Atomic
  ? T
  : T extends readonly unknown[]
    ? { [K in keyof T]: DeepPartial<T[K]> }
    : { [K in keyof T]?: DeepPartial<T[K]> };
```

- **Atomic?** Copy it whole. Flaws 3 and 4 die here: a function stays a function, a `Date` stays a `Date`.
- **Array-shaped?** (`readonly unknown[]` matches both mutable and readonly arrays, and tuples.) Map homomorphically *without* `?`. The container survives (2.2), the elements recurse, and flaws 1 and 2 die: no holes, no shrinking tuples.
- **Otherwise** it's a plain object: map with `?`, recursing. This is the case the type was written for, now the only case that gets the `?`.

`DeepReadonly` needs only two branches:

```ts
export type DeepReadonly<T> = T extends Atomic
  ? T
  : { readonly [K in keyof T]: DeepReadonly<T[K]> };
```

because `readonly` is the one modifier that means the *same* thing for objects, arrays and tuples — homomorphic mapping turns `string[]` into `readonly string[]` and `[number, number]` into `readonly [number, number]` all by itself. Fewer branches isn't a shortcut here; it's the type of the modifier working out.

The test block does two jobs. The `Expect<Equal<>>` tuples state each derived type *exactly* — `DeepPartial<Config>['tags']` is `string[] | undefined`, `['onSave']` is `((event: string) => void) | undefined`, `['users']` is `{ id?: number; name?: string }[] | undefined` — so a future "simplification" that reintroduces any flaw fails at the exact assertion. The `@ts-expect-error` block replays the four garbage values from `original.ts` and requires them to be rejected. Positive space and negative space, which is ts#42's whole discipline.

One honest note: `Atomic` is a *policy*, not a law. `Map<string, number>` isn't on the list, so `DeepPartial` will recurse into it and produce something odd — exactly the flaw-4 shape. That's not an oversight to hide; it's the reason the list is a named, exported type instead of being inlined. When a new built-in shows up in your models, it goes on the list, and the type test you add next to it keeps it there.

## 7. Words you learned (glossary)

- **Utility type** — a generic type that transforms another type (`Partial`, `Readonly`, `Pick`).
- **Recursive type** — a type that refers to itself; like a recursive function, it needs a base case.
- **Base case / leaf** — the point where recursion stops and the value is copied as-is.
- **`object` type** — "anything non-primitive": includes arrays, tuples, functions and class instances.
- **Homomorphic mapped type** — `{ [K in keyof T]: ... }`, which preserves arrays, tuples and modifiers.
- **Modifier (`?`, `readonly`, `-?`, `-readonly`)** — what a mapped type adds to or removes from each property.
- **Sparse array** — an array whose element type includes `undefined`, so it can contain holes.
- **Tuple type** — a fixed-length array type with a type per position.
- **Call signature** — the callable part of a function type; not a property, so mapped types drop it.
- **Contravariance** — parameter types compare backwards, which is why `never[]` parameters match any function.
- **Distributive conditional type** — a conditional over a naked type parameter, applied per union member.
- **`Expect<Equal<A, B>>`** — a type-level assertion that fails the build when a type changes (ts#42).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. In `refactored/deep.ts`, remove `Date` from `Atomic`. **Expected:** ❌ three failures — *both* `createdAt` assertions (the `DeepPartial` one and the `DeepReadonly` one, since they share the leaf list) and the `{ createdAt: {} }` test reporting "Unused '@ts-expect-error'". Flaw 4 is back, and it took exactly one deletion. Now do the same with `AnyFunction` and watch flaw 3 return.
2. Add `?` to the array branch: `{ [K in keyof T]?: DeepPartial<T[K]> }`. **Expected:** ❌ the `tags`, `point` and `users` assertions all fail, and the sparse-array and broken-tuple `@ts-expect-error` tests go unused. One character, three flaws — this is the original's bug, isolated.
3. Write `type Try = DeepPartial<Map<string, number>>` and hover it. **Expected:** a mapped type over `Map`'s methods, all optional — the flaw-4 shape, because `Map` isn't in `Atomic`. Add it (`| Map<unknown, unknown>`) and check again. This is section 6's honest note, verified by hand.
4. Swap the order of the first two branches so `T extends readonly unknown[]` is tested first. **Expected:** ✅ still compiles — arrays aren't atomic and atoms aren't arrays, so these two branches happen not to overlap. Now instead widen the second test to `T extends object`. **Expected:** ❌ nine errors, including `patch` itself ("Property 'host' is missing…") — `object` matches plain objects too, so the array branch swallows them and the `?` branch becomes unreachable. Order only matters between branches that *overlap*, which is exactly why the tests are narrow (section 2.8).
5. Write `type Both = DeepReadonly<DeepPartial<Config>>` and check `Both['tags']`. **Expected:** `readonly string[] | undefined` — the two utilities compose, because each is careful about leaves. Composability is the practical test of whether a recursive type is correct.
6. Delete the `@ts-expect-error` on `{ onSave: 42 }` and read the real error message. **Expected:** "Type 'number' is not assignable to type '(event: string) => void'" — worth seeing once, because in `original.ts` that exact line produces no message at all. Same code, same compiler; the only thing that changed is a type that stopped lying.
