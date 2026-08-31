# 📘 Learning Guide: Narrowing

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code is a pretty-printer: it takes a config value that could be several different things — a string, a number, a list of strings, or nothing (`null`) — and formats it for display.

The type-level problem: the original author knew only one way to deal with "TypeScript won't let me call `.toUpperCase()` on this": the `as` keyword, which forcibly relabels a value's type without checking anything. Six `as` casts later, the function compiles — and crashes on `null` input and on negative numbers. The lesson: when the compiler asks "how do you know it's a string here?", the right answer is a *runtime check the compiler can watch* — called narrowing — not an `as` that just tells it to stop asking.

## 2. Concepts you need first

### Union types (recap)

A union type lists alternatives: `string | number | string[] | null` means "one of: a string, a number, an array of strings, or null." The `|` reads as "or."

While a value has a union type, you can only do things that are legal for EVERY member:

```ts
declare const v: string | number;
v.toString();     // ✅ OK — both strings and numbers have toString
v.toUpperCase();  // ❌ Error: Property 'toUpperCase' does not exist on type 'string | number'
```

The compiler isn't being pedantic — if `v` is a number at runtime, `.toUpperCase()` genuinely crashes. To use member-specific features, you must first figure out *which* member you have. That's narrowing.

### Narrowing (the compiler watches your checks)

**Narrowing** = writing an ordinary runtime check, which the compiler understands, and which shrinks the union inside that branch:

```ts
declare const v: string | number;
if (typeof v === "string") {
  v.toUpperCase();   // ✅ OK — in this branch, v is string
} else {
  v.toFixed(2);      // ✅ OK — by elimination, v is number here
}
```

Notice the `else`: you checked for `string`, so what remains is `number` — the compiler deduced it *by elimination*, like a sudoku. This tracking of checks through your code is called **control-flow analysis**. In an editor, hover the variable at different lines to watch its type shrink.

### The four everyday narrowing tools

**1. Equality (`===`)** — for `null`, `undefined`, and literal values:

```ts
declare const v: string | null;
if (v === null) { /* v is null */ } else { v.toUpperCase(); }  // ✅
```

**2. `typeof`** — for primitives. It returns a string like `'string'`, `'number'`, `'boolean'`. (Careful, JavaScript quirk: `typeof null` is `'object'`, and `typeof someArray` is also `'object'` — `typeof` can't tell arrays apart; that's what `Array.isArray` is for.)

**3. `instanceof`** — for class instances, like `Error` or `Date`:

```ts
declare const e: Error | string;
if (e instanceof Error) { e.message; }  // ✅ e is Error here
```

**4. The `in` operator** — checks whether a property name exists on an object; useful for telling object shapes apart:

```ts
interface Cat { meow: () => string }
interface Dog { bark: () => string }
declare const pet: Cat | Dog;
if ("meow" in pet) { pet.meow(); }  // ✅ pet is Cat here
```

### Type assertions (`as`) — the anti-tool of this exercise

`value as SomeType` tells the compiler: "treat this as SomeType. Don't check. Don't ask." Crucially, `as` is **not a conversion** — it changes nothing at runtime; the value stays whatever it was. It only changes what the compiler *believes*:

```ts
declare const v: string | number;
(v as string).toUpperCase();  // ✅ compiles ALWAYS — 💥 crashes whenever v is a number
```

Every `as` is you answering the compiler's "how do you know?" with "I just do." If you're right, you've gained nothing over a check. If you're wrong, you've shipped a crash. (Rare legitimate uses exist — but they're exercise 14's topic, and none of them are in this file.)

## 3. Walking through the original code

Open `original.ts`. One function:

```ts
export function prettyValue(value: string | number | string[] | null): string {
```

Honest union — four possibilities. Then the "checks":

```ts
if ((value as string).toUpperCase !== undefined) {
  return (value as string).toUpperCase();
}
```

The author probes at runtime whether `.toUpperCase` exists — an almost-reasonable instinct! But it's done *through a cast*, so the compiler can't participate. And the probe has a hole: if `value` is `null`, then `(null).toUpperCase` isn't `undefined` — it's a `TypeError`, immediately. Reading any property off `null` crashes. `prettyValue(null)` dies on this line.

```ts
if ((value as number) > 0) {
  return `${(value as number).toFixed(2)}`;
}
```

"If it's positive, it's the number." But what about *negative* numbers? `-5 > 0` is false, so `-5` falls through this branch entirely...

```ts
return (value as string[]).join(', ');
```

...and lands here, where `(-5).join` doesn't exist. `prettyValue(-5)` crashes with `TypeError: value.join is not a function`.

Six casts, two crashes, zero compiler complaints. The demo calls at the bottom only exercise the happy paths — the two crashing calls are commented out, like a warning label someone chose not to read.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — the null crash.** Runtime story: a config value was never set, so the app passes `null`. The very first line reads `.toUpperCase` off `null` — instant `TypeError`, page dead. The union type SAID null was possible; every cast overrode the warning.

**Flaw 2 — the negative number crash.** Someone sets a temperature offset to `-5`. It's not a string (branch 1 passes it along — assuming it survived, see flaw 1), it's not `> 0` (branch 2 skips), so the code calls `.join()` on it. Crash. The author's hand-rolled logic had a gap the compiler would have caught — if the compiler had been allowed to look.

**Flaw 3 — checks the compiler can't see.** The `.toUpperCase !== undefined` probe is *almost* narrowing — it's a runtime check! But because it's wrapped in casts, TypeScript can't connect it to the type. The author is doing the compiler's job, by hand, badly. Real narrowing does the same kind of check in a form the compiler verifies — and the compiler never leaves a union member unhandled.

**Flaw 4 — `as` scales terribly.** One cast invites the next. Since the first branch cast to `string`, the second must cast to `number`, and the third to `string[]` — each cast an unverified hope, each hope depending on the previous ones being right.

## 5. Try it yourself first!

1. **Vague hint:** Delete every `as` from the function. Read each compiler error — each one is asking "which of the four types is it here?" Answer with checks, not casts.
2. **Warmer:** Handle the cases in this order: first `null`, then `string`, then `number`, and let the array be what's left. Why this order? (Hint: which value crashes when you touch its properties?)
3. **Warmer still:** The tools you need: `value === null` for the null case, `typeof value === 'string'` for strings, `typeof value === 'number'` for numbers. After those three early-returns, hover `value` — what type does the compiler say remains?
4. **Specific:** The negative-number crash wasn't just a bug — it was a missing feature. Decide what `-5` should *display* as (the solution renders it accounting-style: `(5.00)`), and write that branch on purpose.
5. **Victory check:** the last line should be `return value.join(', ')` with NO cast — and it should compile, because the compiler eliminated the other three possibilities itself.

## 6. Understanding the refactored solution

Open `refactored/pretty.ts`. Zero casts. Four narrowing tools on display.

**The main function, narrowed step by step:**

```ts
if (value === null) {
  return '(none)';
}
// below this line: string | number | string[]
```

Null first — the value you can't even probe safely gets eliminated before anything touches a property. Also note: `null` now has a real *output* (`'(none)'`) instead of being a crash.

```ts
if (typeof value === 'string') {
  return value.toUpperCase(); // plain access — value IS string here
}
```

No cast needed — the check itself proved it.

```ts
if (typeof value === 'number') {
  return value < 0 ? `(${Math.abs(value).toFixed(2)})` : value.toFixed(2);
}
```

The negative case got a deliberate answer: `(5.00)`, accounting style. The original's crash case turned out to be a *requirement* nobody had written down — a recurring discovery when you replace casts with real branches.

```ts
return value.join(', ');
```

By elimination — null, string, number all returned — only `string[]` remains, and the compiler *knows* it. The README calls this "the compiler does the sudoku."

**The two demo functions** show the other tools: `instanceof Error` for class instances, and `'meow' in pet` for telling object shapes apart (with the honest note that when you *control* the types, a dedicated tag field is sturdier — that's exercise 10).

**The deep point:** every safety check (`=== null`, `typeof`) is *also* the type check. The lines that make the code safe at runtime are the same lines that make it compile. When those two align, the type system is genuinely working for you.

## 7. Words you learned (glossary)

- **Union type (`|`)** — a type that is one of several alternatives.
- **Narrowing** — shrinking a union type via runtime checks the compiler understands.
- **Control-flow analysis** — the compiler tracking your checks/returns through the code to know types per-line.
- **Narrowing by elimination** — after ruling out other members, the compiler infers the last one remains.
- **`typeof`** — runtime operator giving a primitive's type name (`'string'`, `'number'`...); quirk: arrays and `null` both report `'object'`.
- **`instanceof`** — runtime check for "is this an instance of that class?"
- **`in` operator** — runtime check for "does this object have a property with this name?"
- **Type assertion (`as`)** — forcibly relabeling a value's type; checks nothing, converts nothing.
- **Cast** — informal name for a type assertion.
- **Guard clause** — an early return that handles one case and exits, narrowing what remains.
- **`Array.isArray`** — the correct runtime check for "is this an array?"
- **`Math.abs`** — absolute value; turns `-5` into `5`.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/pretty.ts`**, delete the `if (value === null)` block. Expected: ❌ errors downstream — the final `value.join(', ')` (and possibly earlier lines) complain that `value` is "possibly 'null'". Removing one check un-narrows everything after it.
2. **In `refactored/pretty.ts`**, reorder: move the `typeof value === 'string'` block ABOVE the null check. Expected: ✅ still compiles — `typeof null` is `'object'`, not `'string'`, so the check doesn't accidentally admit null... but hover `value` after the string block: it's still `number | string[] | null`, and the null check below still does its job. Order matters for *readability* here; the compiler tracks any correct order.
3. **In `refactored/pretty.ts`**, change the last line to `return value.join(', ').toUpperCase();` — Expected: ✅ no error. Then change it to `return value.toUpperCase();`. Expected: ❌ error — "Property 'toUpperCase' does not exist on type 'string[]'." Even at the "everything else" position, the compiler knows exactly what type remains.
4. **In `refactored/pretty.ts`**, in `speak`, change `'meow' in pet` to `'purr' in pet`. Expected: ❌ error — `'purr'` exists on neither `Cat` nor `Dog`, so the check can't narrow anything (the error appears on `pet.meow()`; the compiler no longer knows which pet you have).
5. **Rebuild the original's bug:** in `refactored/pretty.ts`, replace the `typeof value === 'number'` check with `if ((value as number) > 0)`. Expected: ✅ it compiles (that's the horror of `as` — it always compiles)... but now `prettyValue(-5)` would crash again at runtime, and the compiler no longer narrows the branches below (hover `value` after the block: still includes `number`). ❌ You should see an error appear on the final `value.join(', ')` line — "does not exist on type 'string | number | string[]'" or similar — the un-narrowed union resurfacing. Casts don't just risk crashes; they starve the sudoku.
