# 📘 Learning Guide: Typed Array Utilities

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

This exercise is about "utility functions" — small helper functions like `unique` (remove duplicates), `sortBy` (sort a list by some property), and `groupBy` (bucket items by a property). Lots of files in a real project call these helpers.

The problem: the original file types every helper with `any`. `any` is TypeScript's "give up" type — a value typed `any` can do anything, and the compiler never complains. The helpers *work* at runtime, but because their types say `any`, every piece of code that *uses* them loses type checking too. A typo in a property name compiles fine and silently breaks the program.

The fix is **generics**: writing the helpers so they keep whatever type you put in, without knowing it in advance.

## 2. Concepts you need first

### `any` — the type that turns checking off
When something is `any`, TypeScript allows every operation on it, right or wrong:

```ts
const x: any = { name: 'ada' };
x.nmae.toUpperCase(); // ✅ compiles... but crashes at runtime (nmae is undefined)
```

The scary part: `any` is contagious. If a function returns `any`, everything you compute from that result is `any` too. (Exercise 01's LEARN.md covers this fully.)

### Generics — a placeholder for "whatever type comes in"
A generic function has a **type parameter**, usually written `<T>`. Think of `T` as a blank the compiler fills in for each call:

```ts
function first<T>(items: T[]): T {
  return items[0];
}
const n = first([1, 2, 3]);      // T becomes number → n is number
const s = first(['a', 'b']);     // T becomes string → s is string
s.toUpperCase(); // ✅ OK — the type flowed through
```

You almost never write `first<number>(...)` yourself — the compiler **infers** `T` from the argument. (Exercise 16's LEARN.md explains generics from scratch.)

### Two type parameters that flow together
A function can have several placeholders. Here `K` is *whatever the callback returns*:

```ts
function pick<T, K>(item: T, getKey: (item: T) => K): K {
  return getKey(item);
}
const k = pick({ score: 95 }, (p) => p.score); // K becomes number
```

This "the key type flows from the function you pass" idea is the heart of this exercise.

### Callback types
A **callback** is a function you pass into another function. Its type is written with an arrow: `(item: T) => K` means "takes a `T`, returns a `K`". When TypeScript already knows `T`, you don't need to annotate the parameter — this is called **contextual typing**:

```ts
[1, 2, 3].map((n) => n * 2); // n is number — no annotation needed
```

### Generic constraints — `K extends string | number`
`extends` in a generic means "K must be at least this". It limits what callers can plug in:

```ts
function biggest<K extends string | number>(a: K, b: K): K {
  return a > b ? a : b;
}
biggest(1, 2);        // ✅ OK
biggest({}, {});      // ❌ Error: {} is not string | number
```

Why constrain? Because the function's *body* compares values with `<`. Comparing objects with `<` is meaningless in JavaScript, so the type stops you from asking for nonsense.

### `readonly T[]` — promising not to change the input
`readonly` before an array type means the function will not mutate (modify) it:

```ts
function firstOf(items: readonly number[]): number | undefined {
  return items[0];  // ✅ reading is fine
  // items.push(4); // ❌ Error: push doesn't exist on readonly arrays
}
```

Exercise 08's LEARN.md covers `readonly` fully.

### `Map` — a dictionary with typed keys
A `Map<K, V>` stores key→value pairs. Unlike plain objects (whose keys become strings), a `Map` keeps the key's real type. `Map<number, string>` means: keys are numbers, values are strings. `map.get(key)` returns `V | undefined` (undefined if missing).

### `@ts-expect-error` — asserting that something must NOT compile
A comment that says "the next line SHOULD be a compile error." If the line errors, all good. If the line unexpectedly compiles, the comment *itself* becomes an error:

```ts
// @ts-expect-error — strings can't be added to numbers like this
const bad: number = 'hello';  // ✅ the file compiles, because the error was expected
```

The refactored file uses this to prove the old bugs can no longer happen.

## 3. Walking through the original code

The file starts with three helpers, all typed with `any`:

```ts
export function unique(items: any[]): any[] {
  return [...new Set(items)];
}
```

The body is fine — a `Set` drops duplicates, `[...]` turns it back into an array. But the signature says: "give me anything, get back anything." Whatever type you had going in is forgotten coming out.

```ts
export function sortBy(items: any[], keyOf: (item: any) => any): any[] {
```

`sortBy` takes a list plus a callback (`keyOf`) that says which value to sort on. Because the callback is `(item: any) => any`, TypeScript never checks what you do inside it. Then, downstream:

```ts
const sorted = sortBy(players, (p) => p.scroe);
```

`scroe` is a typo — the property is `score`. Because `p` is `any`, the compiler shrugs. At runtime `p.scroe` is `undefined` for every player, so every sort comparison is `undefined < undefined` (always false) — the "sorted" array comes back in arbitrary order. No error. No warning. Just quietly wrong data.

```ts
export const topName: string = sorted[0].nmae;
```

Another typo (`nmae`). Since `sorted` is `any[]`, `sorted[0].nmae` is `any`, and `any` fits into a `string` variable. The type says string; the runtime value is `undefined`. The type is lying.

```ts
const byScore = groupBy(players, (p) => p.score);
export const group = byScore.get('95');
```

`groupBy` returns `Map<any, any[]>`. The real keys are numbers (scores like 95), but `.get('95')` passes a *string*. A `Map` treats `95` and `'95'` as different keys, so this lookup returns `undefined` — always. `Map<any, ...>` couldn't warn about it.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: `any` in a helper leaks into every caller.** Utility functions are called from everywhere. If they eat and return `any`, every file that uses them loses checking. It's like one broken smoke detector disabling all the others in the building.

**Runtime bug story:** You ship the leaderboard. It looks sorted in your test (2 players, lucky order). In production with 500 players, the list is shuffled — because `p.scroe` was `undefined` for everyone and the sort never sorted anything. The compiler could have caught the typo in 0.1 seconds. It was told not to look.

**Flaw 2: the types actively lie downstream.** `topName: string` is declared a string but holds `undefined`. Later, `topName.toUpperCase()` crashes with "Cannot read properties of undefined."

**Flaw 3: the Map lost its key type.** JavaScript `Map`s were chosen precisely because they keep key types honest (a number key stays a number). Typing it `Map<any, any[]>` throws that honesty away, so a wrong-typed key (`'95'` instead of `95`) becomes a lookup that always fails, silently.

**Flaw 4 (small but telling): the `!` in `groupBy`.** `groups.get(key)!` uses the **non-null assertion** — `!` means "trust me, this isn't undefined." Here it happens to be true, but `!` is a habit worth breaking: it silences the compiler instead of convincing it.

## 5. Try it yourself first!

Try fixing `original.ts` before reading the solution.

1. **Vague hint:** The bodies of the functions are correct. Only the *signatures* need to change. Don't touch the logic.
2. **Less vague:** Each function should work "for any element type" — that's the definition of a generic. Start with `unique`: what should go in and come out?
3. **More specific:** `unique<T>(items: T[]): T[]`. Now do `sortBy` — it needs *two* type parameters: one for the items, one for the sort key the callback returns.
4. **Very specific:** `sortBy<T, K>(items: T[], keyOf: (item: T) => K): T[]`. Then ask: what does the body *do* with `K`? It compares with `<`. Add a constraint so only comparable types are allowed.
5. **For `groupBy`:** the return should be `Map<K, T[]>` so the key type is preserved. Bonus: remove the `!` by calling `groups.get(key)` once, storing it in a variable, and checking it with `if`.

Check your work with `npm run typecheck` from the `typescript/` folder — the typos in the demo code should now be errors.

## 6. Understanding the refactored solution

```ts
export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}
```

Same body, but now: pass `Player[]` in, get `Player[]` out. `readonly` also promises the input is never mutated.

```ts
export function sortBy<T, K extends string | number>(
  items: readonly T[],
  keyOf: (item: T) => K,
  { descending = false }: { descending?: boolean } = {},
): T[] {
```

Three ideas here:
- `T` is the item type, `K` is whatever the callback returns.
- `K extends string | number` — the constraint. The body compares keys with `<`, and `<` only behaves sensibly for strings and numbers. Try `sortBy(players, (p) => p)` and the compiler refuses: objects aren't orderable. The constraint encodes a *runtime truth* about the body.
- The third parameter is an options object with a default — callers can pass `{ descending: true }` or nothing.

```ts
export function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
```

The return type `Map<K, T[]>` keeps the key type. `groupBy(players, (p) => p.score)` gives `Map<number, Player[]>`, and now `.get('95')` is a compile error — the always-undefined lookup can't be written.

Inside, the `!` is gone:

```ts
const group = groups.get(key);
if (group) group.push(item);
else groups.set(key, [item]);
```

Instead of asserting "trust me it exists," the code gets the value once and *checks* it. The compiler is convinced, not silenced.

The usage section shows the payoff: `sortBy(players, (p) => p.score)` — no annotations anywhere, `p` is inferred as `Player`, the result is `Player[]`, and `sorted[0]!.name` is a real `string`. Finally, four `@ts-expect-error` lines pin down that every original bug (both typos, the string key, the object sort key) is now a compile error forever.

## 7. Words you learned (glossary)

- **Utility function**: a small, reusable helper called from many places.
- **`any`**: the type that disables checking; anything goes, errors included.
- **Generic**: a function or type with a placeholder type (`<T>`) filled in per use.
- **Type parameter**: the placeholder itself (`T`, `K`).
- **Type inference**: the compiler figuring out types without annotations.
- **Contextual typing**: parameters of a callback getting their types from where the callback is used.
- **Callback**: a function passed as an argument to another function.
- **Constraint (`extends`)**: a rule limiting what a type parameter may be.
- **`readonly` array**: an array the function promises not to modify.
- **`Map<K, V>`**: a key→value store that keeps the key's real type.
- **Non-null assertion (`!`)**: "trust me, not null/undefined" — silences the compiler.
- **`@ts-expect-error`**: a comment asserting the next line must fail to compile.
- **Mutation**: changing data in place (push, sort without copying, etc.).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change (works offline if `node_modules` is installed). Undo each change afterward.

1. In `refactored/array-utils.ts`, change `sortBy`'s constraint to just `K extends string`. Expect: the demo call `sortBy(players, (p) => p.score)` now errors — `number` no longer satisfies the constraint.
2. Delete one of the `@ts-expect-error` comments (e.g., above `byScore.get('95')`). Expect: the line under it becomes a real compile error — that's the test working.
3. Add `items.push(items[0]!)` inside `unique`. Expect: error — `push` does not exist on `readonly T[]`. The readonly promise is enforced on the inside too.
4. Call `chunk(players, 0)` in the usage section. Expect: it compiles! The "size must be positive" rule is a *runtime* check (it throws), not a type. Some rules live outside the type system — exercise 29 (branded types) shows one way to move them in.
5. Change `groupBy`'s return type to `Map<string, T[]>`. Expect: errors inside the body (a `K` key doesn't fit a `string` map) — the compiler catches the mismatch between signature and implementation.
