# 📘 Learning Guide: Fluent Builder

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A **fluent builder** is an object you configure by chaining method calls: `query().from('users').select('id').where('active = 1').build()`. It reads like a sentence, which is why the pattern is everywhere — query builders, HTTP clients, test fixtures, animation APIs.

The catch: the classic implementation has every method `return this`, so the builder's *type* is identical at every link in the chain. The compiler therefore offers `.build()` to a brand-new builder as readily as to a fully configured one — and a half-built query either throws or, worse, produces `'SELECT  FROM users'` and lets a database report the problem hours later.

The fix is to make the builder's type change as you build. Each required step returns a *slightly richer* type, and the terminal `.build()` only exists on the richest one. This is called **typestate**: the state of the object lives in its type, where the compiler can see it.

## 2. Concepts you need first

### 2.1 Returning `this` vs. returning a specific type

```ts
class A {
  step(): this { return this; } // "the same type I already am"
}
```

`this` as a return type is what makes chaining work in the original — and what makes it useless for tracking progress: the type after the call is the type before the call. To track anything, a method must return something *different*.

### 2.2 A type parameter can hold a set of strings

```ts
type Part = 'table' | 'columns';
class Query<Have extends Part = never> {}

declare const fresh: Query<never>;              // nothing done yet
declare const withTable: Query<'table'>;        // one step done
declare const ready: Query<'table' | 'columns'>; // both
```

`never` is the empty union — the natural "empty set" default. Adding to the set is just a union: `Have | 'table'`. Two nice properties come free:

```ts
type Twice = 'table' | 'table';            // ✅ 'table' — adding twice is harmless
type Either = ('table' | 'columns');       // order is irrelevant
```

That's why the refactor's chain works in any order.

### 2.3 `this` parameters — a requirement on the receiver

A first parameter literally named `this` is not a runtime argument; it's a constraint on what the method may be called *on*:

```ts
class Box<T> {
  constructor(readonly value: T) {}
  unwrapNumber(this: Box<number>): number { return this.value; }
}
const nums = new Box(1);
const strs = new Box('a');
nums.unwrapNumber(); // ✅
strs.unwrapNumber(); // ❌ Error: 'Box<string>' is not assignable to 'Box<number>'
```

`this` parameters are erased at compile time — nothing changes at runtime. They are the tool for "this method only makes sense on some instances."

(Notice that `Box` *uses* `T`, in `value`. Hold that thought until 2.4 — it turns out to be the whole exercise.)

### 2.4 Why the type parameter needs a phantom

Here is the trap that catches everyone the first time. TypeScript compares types **structurally** (ts#29's 2.1). If `Have` never appears in any member of the class, then `Query<'table'>` and `Query<'table' | 'columns'>` have identical structure, so they're the same type — and the `this` parameter checks nothing:

```ts
class Silent<Have extends string> {          // Have is unused!
  gate(this: Silent<'a' | 'b'>): void {}
}
declare const partial: Silent<'a'>;
partial.gate(); // ✅ compiles — no protection at all
```

Give the parameter a *use* and the comparison becomes real:

```ts
class Loud<Have extends string> {
  declare private readonly have: Record<Have, true>; // phantom
  gate(this: Loud<'a' | 'b'>): void {}
}
declare const partial2: Loud<'a'>;
partial2.gate(); // ❌ Error — { a: true } lacks the b property
```

`Record<'a', true>` is `{ a: true }`; `Record<'a' | 'b', true>` is `{ a: true; b: true }`. The first is missing a property the second requires, so the assignment fails — which is exactly the check we want. This is ts#29's brand with a different job: a marker property that exists only in the type.

### 2.5 `declare` on a class field

```ts
declare private readonly have: Record<Have, true>;
```

`declare` means "this field exists as far as the type system is concerned; emit nothing." No initializer is needed (so `strictPropertyInitialization` is satisfied), no property is created at runtime, and nobody can read it by accident. It is the cleanest way to write a phantom on a class.

### 2.6 Assignability direction — "more done" fits "less done"

With `Record<Have, true>` as the phantom, a *more* complete builder is assignable to a *less* complete type, and not the reverse:

```ts
declare const both: Query<'table' | 'columns'>;
const fewer: Query<'table'> = both;  // ✅ { table; columns } has everything { table } needs
declare const one: Query<'table'>;
const more: Query<'table' | 'columns'> = one; // ❌ missing 'columns'
```

That's the right direction: a finished builder can stand in for a partial one, but not the other way round.

### 2.7 Unrepresentable beats guarded

The original's `build()` starts with `if (this.table === null) throw`. The refactor's doesn't — and that's not carelessness. When a state can't be constructed, code defending against it is dead code. Deleting a runtime check *because the type makes it impossible* is the whole point of exercise 30, and one of the few times deleting error handling makes a program safer.

## 3. Walking through the original code

```ts
export class QueryBuilder {
  private table: string | null = null;
  private columns: string[] = [];
  ...
  from(table: string): this { this.table = table; return this; }
  select(...columns: string[]): this { this.columns.push(...columns); return this; }
  build(): string {
    if (this.table === null) throw new Error('build(): no table — did you forget .from()?');
    ...
  }
}
```

Read the return types: `this`, `this`, `this`. The chain's type never moves. So all three of these are equally well-typed:

- `goodCase()` — from, select, where, build. Correct.
- `buildWithNoTable()` — where, limit, build. Compiles; throws at runtime.
- `buildWithNoColumns()` — from, build. Compiles; returns `'SELECT  FROM users'`, which is *worse than throwing* because nothing fails at the point of the mistake.

`contradictions()` shows the softer version: two `.from()` calls, two `.limit()` calls, last one silently wins. Nothing here is a type error, because there is nothing in the type to be wrong about.

## 4. What's wrong with it (in beginner terms)

**Bug story 1 — the 3am SQL.** A reporting job calls `.from('events').build()` on a code path that used to add columns and no longer does. No exception, no failed test, no log line: just `'SELECT  FROM events'` handed to the driver. The alert fires as a database syntax error at 3am, naming a file inside the driver package. The actual mistake is four layers up and looks perfectly ordinary.

**Bug story 2 — the helpful helper.** Someone refactors the shared setup into `function baseQuery() { return new QueryBuilder().select('id', 'name'); }` and callers add `.from(...)`. Then one caller forgets. `.build()` throws, in production, on the one endpoint nobody tested — and the type of `baseQuery()`'s return value gave no hint that anything was still required.

**Why documentation doesn't fix it:** you can write "call `.from()` before `.build()`" in a doc comment, and people will still call them out of order, because autocomplete offers `.build()` the moment you type a dot. The API *shows* you a legal move that isn't legal. Types are how you take a move off the board.

## 5. Try it yourself first!

1. **Vague hint:** the compiler needs to know how far along the chain you are. Where could that information live, given that `this` is the same type at every step?
2. **Warmer:** give the class a type parameter holding the set of completed required steps: `class Query<Have extends Part = never>`. What should `from()` return? (Section 2.2.)
3. **Warmer still:** `build()` must only be callable when both flags are present. You don't need a new class or an interface — you need a `this` parameter (section 2.3).
4. **The trap:** write it that way and the premature `.build()` still compiles. Read section 2.4 and add the phantom field. This is the step everyone misses, and it's the interesting one.
5. **Finishing touch:** make `where()` and `limit()` return `Query<Have>` so optional steps can appear anywhere, then delete the `if (this.table === null) throw` from `build()` and notice that nothing breaks — because nothing can.

## 6. Understanding the refactored solution

```ts
export type Part = 'table' | 'columns';

export class Query<Have extends Part = never> {
  declare private readonly have: Record<Have, true>;
  ...
  from(table: string): Query<Have | 'table'> { this.table = table; return this as Query<Have | 'table'>; }
  select(...columns: string[]): Query<Have | 'columns'> { ... }
  where(condition: string): Query<Have> { ...; return this; }
  build(this: Query<'table' | 'columns'>): string { ... }
}
```

Four moving parts, each doing one job:

- `Have` is the set of completed required steps, defaulting to `never` (nothing done).
- The phantom `have` field makes `Have` structurally load-bearing (2.4). Without it, the rest is decoration.
- Required steps union their flag into the returned type; optional steps pass `Have` straight through.
- `build`'s `this` parameter demands the full set.

The `return this as Query<Have | 'table'>` casts deserve a word. At runtime the object genuinely is the same object; only its *type* advances. The compiler can't verify that the flag is now justified — that's a fact about the assignment on the previous line — so each transition contains one contained cast (ts#20), confined to the class that owns the invariant, behind a signature callers can trust.

The type tests do two different jobs. The `Expect<Equal<...>>` block asserts the *transitions* — `ReturnType<Query<never>['from']>` really is `Query<'table'>`, `where()` really leaves the set alone, `from()` twice really is idempotent — so a future refactor that quietly stops advancing the type fails the build. The `@ts-expect-error` block replays the original's three bugs, including the half-built value passed around as `Query<'table'>`: its type states its gap, so even at a distance from the chain it can't be finished.

**What this pattern costs.** Every required step adds a flag, and the class signature grows. For two or three gates that's a bargain; for ten, look at the alternative in ts#46 (a separate type per stage), which trades flexible ordering for a simpler type. Both are typestate; they differ in whether states are *combinations* or a *sequence*.

## 7. Words you learned (glossary)

- **Fluent interface / method chaining** — an API where methods return an object you can immediately call again.
- **Builder pattern** — assembling a complex value step by step, then producing it with a terminal method.
- **Typestate** — encoding an object's current state in its type, so illegal operations don't compile.
- **`this` return type** — "the same type as the receiver"; makes chaining work, but cannot track progress.
- **`this` parameter** — a compile-time-only first parameter constraining what the method can be called on.
- **Phantom field** — a property that exists only in the type, giving a type parameter something to compare (ts#29).
- **`declare` field** — a class field declared for the type system with no runtime existence.
- **Structural typing** — TypeScript compares shapes, not names; unused type parameters compare as equal.
- **`never` as the empty union** — the natural "no flags set" starting value.
- **Idempotent union** — `'a' | 'a'` is `'a'`; calling a step twice can't corrupt the set.
- **Terminal method** — the method that ends a chain and produces the result.
- **Unrepresentable state** — a state the type system won't let you construct, so no runtime guard is needed (ts#30).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. **The important one.** Delete the `declare private readonly have` line from `refactored/query.ts`. **Expected:** ❌ all four `@ts-expect-error` tests report "Unused '@ts-expect-error' directive" — the protection evaporated, silently, and only the type tests noticed. Now put the line back and re-read section 2.4. This is the difference between a type parameter that *tracks* something and one that merely decorates.
2. Change `where()` to return `Query<Have | 'columns'>` (and cast in its body to match). **Expected:** ❌ exactly one failure, and it's a *type test*: `Expect<Equal<ReturnType<Query<'table'>['where']>, Query<'table'>>>` reports "Type 'false' does not satisfy the constraint 'true'". Nothing else complains, because `.where()` counting as "columns chosen" is nonsense the compiler has no way to detect — *you* define what the flags mean. Types enforce your model; only the assertions about the transitions notice when the model changes.
3. Add a third required part: `type Part = 'table' | 'columns' | 'where'` and gate `build` on all three. **Expected:** ❌ the existing good chains stop compiling until they add `.where(...)`. Try it, then undo it, and notice how quickly the flag count becomes a design decision rather than a free upgrade.
4. Write `const partial = query().from('users');` and then, on a later line, `partial.select('id').build();`. **Expected:** ✅ compiles — the chain doesn't have to be one expression, because the state travels in the *value's type*, not in the syntax. Then try `partial.build()`. **Expected:** ❌ — the gap is still there.
5. Try to defeat it: `(query() as Query<'table' | 'columns'>).build()`. **Expected:** ✅ compiles, and throws nothing but produces `'SELECT  FROM '` — the ts#29 lesson repeats, `as` can always force a lie. The pattern protects against mistakes, not against determined casting; keeping `as Query<...>` inside the class is the code-review rule.
6. Write `query().from('users').from('orders').select('id').build();`. **Expected:** ✅ compiles — the original's `contradictions()` bug is *not* fixed by this design, because `'table' | 'table'` is just `'table'` (section 2.2) and the set can't tell "set once" from "set twice". Honest limitation, and a design decision: flags track *whether*, not *how many times*. Catching repeats needs a phantom that can say "this step is still available", which is a different (and much fussier) shape than "this step is done" — worth knowing exists, rarely worth the complexity.
