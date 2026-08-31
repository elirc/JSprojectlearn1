# 📘 Learning Guide: Generics Intro

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code wants one tiny utility: "give me the first element of an array, or `null` if it's empty." Simple. But the original has THREE copies of it — `firstString`, `firstNumber`, `firstUser` — identical except for the type in the signature. Plus a fourth attempt, `firstAny`, that handles every type by checking none of them.

The type-level problem: how do you write ONE function that works for arrays of anything, *without* giving up type checking? The answer is generics — the single most important tool in the second half of this track.

## 2. Concepts you need first

### The copy-paste problem (why this exercise exists)

When two functions differ only in a *value*, you promote the value to a parameter — that's just programming. This exercise is the same move where the difference is a *type*:

```ts
function firstString(items: string[]): string | null { /* ... */ }
function firstNumber(items: number[]): number | null { /* ... */ }
// identical bodies. The only difference: string vs number.
```

Copies drift: fix a bug in one, forget the other. And each new element type demands a new copy.

### Why `any` is not the answer

```ts
function firstAny(items: any[]): any { return items[0] ?? null; }

firstAny([1, 2]).toUpperCase();   // ✅ compiles... 💥 crashes: numbers
                                   //    have no toUpperCase
```

`any` erases the connection between what goes in and what comes out. The return is `any`, `any` allows everything, and the checking you had in the per-type copies is gone. One function, zero safety. (Exercise 01's LEARN.md covers `any`'s spreading damage.)

### Type parameters — `<T>` from absolute scratch

A **generic function** takes a *type* as a parameter, alongside its value parameters. The angle brackets declare it:

```ts
function first<T>(items: T[]): T | null {
  return items.length > 0 ? items[0]! : null;
}
```

Read it in three parts:

- `<T>` — "this function has a type parameter named T." T is a placeholder, filled in per call.
- `items: T[]` — "items is an array of T, whatever T turns out to be."
- `: T | null` — "the return is a T, or null."

`T` is just a name (short for Type, by convention). You could call it `<Item>`. The power is the *repetition*: the same `T` appearing in the parameter AND the return links them — "whatever type of array you give me, THAT type comes back."

### Inference — callers never write `<T>`

You *can* call `first<string>(names)`, but you almost never do. The compiler **infers** T from the argument:

```ts
const names = ['ada', 'grace'];
const f = first(names);   // T inferred as string; f: string | null
const n = first([1, 2]);  // T inferred as number; n: number | null
```

Each call gets its own T. One implementation, per-caller types. Hover the calls in an editor to watch T change.

### Generic ≠ permissive

A crucial mindset: generics keep ALL the checking. The compiler typechecks the body once, for an *unknown* T — so the body can only do things valid for every possible T. And it checks every call site with the inferred T:

```ts
const s: string = first([1, 2]);   // ❌ Error: number | null ≠ string
```

Compare `firstAny([1,2])` assigned to a string: ✅ compiles, lies. Generic: one copy, still honest.

### Multiple type parameters — types flowing through

A function can have several type parameters, and they can connect an input callback to the output:

```ts
function mapOne<T, R>(item: T, fn: (x: T) => R): R {
  return fn(item);
}
const len = mapOne('hello', (s) => s.length);  // T=string, R=number; len: number
```

T comes from the argument; R comes from what the callback returns. The types flow *through* the function. No annotations at the call site — contextual typing (exercise 15) types `s` for free.

### Small supporting cast

- **`readonly T[]`** — an array the function promises not to modify (exercise 08's lesson riding along).
- **`T | null` and null-checking** — the honest "might be empty" return; callers must check before using (exercise 05's lesson, fully explained in its LEARN.md).
- **`items[0]!`** — the non-null assertion. Inside the body it's justified: the `length > 0` check on the same line guarantees the element exists, but the compiler doesn't connect index checks to index reads (until exercise 39's `noUncheckedIndexedAccess` discussion). This is the rare defensible `!`.
- **Tuple type `[T, T]`** — an array with exactly two elements, both T. Used by `pair`.

## 3. Walking through the original code

Open `original.ts`. Three identical bodies:

```ts
export function firstString(items: string[]): string | null {
  return items.length > 0 ? items[0]! : null;
}
export function firstNumber(items: number[]): number | null {
  return items.length > 0 ? items[0]! : null;
}
```

...plus `firstUser`. Same logic, three maintenance points. Each is *correctly typed* — that's worth noticing. The copies aren't unsafe; they're unsustainable.

Then the team's "clever" consolidation:

```ts
export function firstAny(items: any[]): any {
  return items.length > 0 ? items[0] : null;
}

export const upper = firstAny(names).toUpperCase(); // works today...
export const kaboom = firstAny([1, 2]).toUpperCase(); // ...compiles, crashes
```

`upper` happens to work because `names` holds strings. `kaboom` is the same line with numbers: `toUpperCase` doesn't exist on numbers, the call returns... wait, no — it *throws* `TypeError: firstAny(...).toUpperCase is not a function`. The compiler said nothing, because `any` says yes to everything. Also notice: `firstAny` can return `null`, and `any` doesn't even force a null check — TWO checks lost.

Finally the same disease spreading to a second family:

```ts
export function pairStrings(a: string, b: string): string[] { return [a, b]; }
export function pairNumbers(a: number, b: number): number[] { return [a, b]; }
```

The closing comment names the dilemma: duplicate-per-type (checked, drifting copies) vs `any` (one copy, unchecked). Exercise 14 had the same shape of dilemma — and again there's a third option.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — copies drift.** Runtime story: QA reports that empty arrays crash. Someone fixes `firstString` to return `null`... and forgets `firstUser`. Six weeks later the user list page crashes on a fresh install (zero users) while every other page is fine. Nobody thinks to check "the same function" because it *isn't* the same function — it's three.

**Flaw 2 — `any` breaks the in/out connection.** The entire value of `first` is "array of X in, X out." `firstAny` forgets X between the parameter and the return. `kaboom` compiles because the return is `any` — the crash moved from compile time (where it costs seconds) to runtime (where it costs a user).

**Flaw 3 — `any` also dropped the null honesty.** `firstAny([])` returns `null`, and `firstAny([]).toUpperCase()` compiles without a murmur. The per-type versions at least forced callers to handle `| null`. The consolidation didn't just lose element types; it lost the empty-array safety too.

**Flaw 4 — the families multiply.** `pairUsers`, `pairDates`... every new type taxes every utility family. This is a treadmill, not a codebase.

## 5. Try it yourself first!

1. **Vague hint:** The three `first*` functions differ in exactly one thing. Programming has a universal move for "same code, one difference": make the difference a parameter. What kind of parameter would a *type* need to be?
2. **Warmer:** Write `function first<T>(items: T[]): T | null` and copy the shared body in. Delete the three old functions. Do the call sites still work with no changes?
3. **Warmer still:** Hover `first(names)` and `first(scores)` (or assign them to deliberately wrong types and read the errors). Is the element type coming back out?
4. **Specific:** Do `pair` next: `pair<T>(a: T, b: T): [T, T]`. Then predict: does `pair('a', 1)` compile? Why or why not? Test your prediction.
5. **Stretch:** Write `firstMapped<T, R>(items: T[], fn: (item: T) => R): R | null` — first element, transformed. Call it as `firstMapped(names, (n) => n.length)` and hover the result. Two type parameters, both inferred.

## 6. Understanding the refactored solution

Open `refactored/utils.ts`.

**The generic `first`:**

```ts
export function first<T>(items: readonly T[]): T | null {
  return items.length > 0 ? items[0]! : null;
}
```

One body — the *same* body the three copies shared. `<T>` declares, `readonly T[]` uses, `T | null` returns. The `readonly` is a bonus courtesy: this function has no business mutating your array, and now the type says so.

**Inference at work:**

```ts
export const firstName = first(names);   // string | null
export const topScore = first(scores);   // number | null
```

No `<...>` at any call site. And the honesty survived:

```ts
export const upper = firstName === null ? '' : firstName.toUpperCase();
```

The `| null` still forces the check — generics preserved safety, not just deduplicated code. The type test `first(names).toUpperCase()` must-not-compile pins this.

**`pair` and the shared T:**

```ts
export function pair<T>(a: T, b: T): [T, T] { return [a, b]; }
```

Both parameters are the SAME T, so `pair('a', 1)` is rejected — the compiler can't pick a T that is both string and number (it won't silently union them for you here). The return `[T, T]` is a tuple: exactly two elements, both T.

**`firstMapped` — flow-through:**

```ts
export function firstMapped<T, R>(items: readonly T[], fn: (item: T) => R): R | null {
  return items.length > 0 ? fn(items[0]!) : null;
}
```

T from the array, R from the callback's return: `firstMapped(names, (n) => n.length)` is `number | null` with zero annotations. This flow-through is the pattern exercise 19 applies to a whole utility belt.

**When NOT to write a generic** (the README's restraint note): reach for `<T>` when you have, or clearly foresee, two copies differing only by type. A generic nobody instantiates twice is speculation.

## 7. Words you learned (glossary)

- **Generic function** — a function with type parameters, reusable across types without losing checking.
- **Type parameter (`<T>`)** — a placeholder type, filled in per call; declared in angle brackets.
- **Inference (of T)** — the compiler deducing the type argument from the value arguments; callers rarely write `<T>` explicitly.
- **Instantiation** — one particular filling-in of a type parameter (T = string for this call).
- **Flow-through** — a type parameter connecting an input (array, callback) to the output type.
- **Tuple type (`[T, T]`)** — an array type with a fixed length and per-position types.
- **`readonly T[]`** — an array the function promises not to modify.
- **Non-null assertion (`!`)** — "trust me, not null/undefined"; defensible here only because the same expression checks `length` first.
- **Speculative generality** — abstraction built for reuse that never comes; the reason not to generic everything.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/utils.ts`**, call `first<string>(scores)` (explicit type argument, wrong array). Expected: ❌ "number is not assignable to string" — explicit type arguments are allowed, and then the VALUES are checked against them. Inference is just the compiler picking this argument for you.
2. **In `refactored/utils.ts`**, add `export const mixed = pair('a', 1);`. Expected: ❌ error on the second argument. Then try `pair<string | number>('a', 1)`. Expected: ✅ compiles — YOU chose T as a union, explicitly. Inference wouldn't volunteer that; explicitness makes the loosening visible.
3. **In `refactored/utils.ts`**, change the body of `first` to `return items[0] ?? null;` (drop the length check and the `!`). Expected: ✅ compiles and is arguably cleaner — but ponder on the plane: for an array like `[undefined, 'x']` with T including undefined, `??` converts a real first element to null. Behavior subtly differs; types alone didn't decide this one.
4. **In `refactored/utils.ts`**, inside `first`'s body, add `items.push(items[0]!)` before the return. Expected: ❌ "Property 'push' does not exist on type 'readonly T[]'" — the readonly promise binds the *body*, not just callers.
5. **In `refactored/utils.ts`**, change `firstMapped`'s return type from `R | null` to `T | null`. Expected: ❌ the body fails — `fn(...)` produces R, not T. The signature's type parameters and the body must tell the same story; you can't accidentally return the wrong one.
