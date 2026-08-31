# 📘 Learning Guide: Schema Infer

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A **validator** checks that data coming from outside your program — a JSON response, a form body, a config file — really has the shape you expect. This project's validator does that job correctly at runtime, and then throws away everything it learned: it returns `any`. So the data is *checked* at the boundary and *unchecked* everywhere afterwards, which is precisely backwards.

The team patches the hole by hand-writing an `interface User` next to the schema and asserting onto it. Now the same shape is described twice — once as runtime data, once as a type — and the two copies drift apart. A field lives in one and not the other, and the compiler cheerfully vouches for data nobody validated.

The fix is to make the schema **carry its own type**, so `Infer<typeof schema>` *derives* the interface instead of duplicating it. That's the idea behind zod, valibot, io-ts and every library like them, and it fits in about eighty lines.

## 2. Concepts you need first

### 2.1 A type parameter can be a label, not just a container

You already know `Array<string>` — a box whose type parameter says what's inside. A type parameter can also record what a value *produces*:

```ts
interface Validator<T> {
  readonly parse: (value: unknown) => T;
}
declare const v: Validator<number>;
const n = v.parse('anything'); // n: number — T flows out through parse
```

`Validator<number>` and `Validator<string>` are different types even though both objects look identical at runtime. The `T` is real information, attached to a value.

### 2.2 `typeof value` — crossing from the value world to the type world

Most of TypeScript's syntax lives in one world or the other. `typeof` (in a *type* position) is the bridge:

```ts
const config = { retries: 3, host: 'localhost' };
type Config = typeof config; // { retries: number; host: string }
```

This is what lets a *value* (your schema object) become the source of a *type*.

### 2.3 Conditional types + `infer` — reading a type back out

You met these in exercise 27. `infer` is pattern-matching for types: it names a piece of a type so you can return it.

```ts
type Unwrap<T> = T extends Promise<infer Inner> ? Inner : T;
type A = Unwrap<Promise<string>>; // ✅ string
type B = Unwrap<number>;          // ✅ number (no match, falls through)
```

`Infer<S>` in this project is the same move aimed at `Validator`:

```ts
type Infer<S> = S extends Validator<infer T> ? T : never;
type C = Infer<Validator<boolean>>; // ✅ boolean
type D = Infer<'nope'>;             // ✅ never — not a validator, nothing to infer
```

### 2.4 Generic capture vs. annotation — the difference that makes it work

This is the subtle part, and it decides whether the whole design works. Compare:

```ts
// Annotated parameter: the argument is WIDENED to the annotation.
function widened(shape: Record<string, Validator<unknown>>) { return shape; }
const a = widened({ name: s.string() });
// a: Record<string, Validator<unknown>> — the key `name` is GONE

// Generic parameter: the argument's exact type is CAPTURED.
function captured<S extends Record<string, Validator<unknown>>>(shape: S) { return shape; }
const b = captured({ name: s.string() });
// b: { name: Validator<string> } — every key and every T preserved
```

`extends` here is a *requirement*, not a replacement (exercise 17). The generic still remembers exactly what you passed. That's exercise 31's widening lesson wearing a different hat.

### 2.5 Mapped types over a captured shape

Once you've captured `{ name: Validator<string>; age: Validator<number> }`, a mapped type (exercise 25) rewrites each value:

```ts
type Outputs<S> = { [K in keyof S]: Infer<S[K]> };
// { name: Validator<string>; age: Validator<number> }
//   becomes
// { name: string; age: number }
```

That one line is the bridge from "a record of validators" to "the shape they validate."

### 2.6 `unknown` vs `any` at the boundary

```ts
const parsed: any = JSON.parse(raw);
parsed.whatever.at.all; // ✅ compiles — any disables checking (exercise 01)

const honest: unknown = JSON.parse(raw);
honest.name; // ❌ Error: 'honest' is of type 'unknown'
```

`unknown` forces you to prove something before you use it. A validator is exactly the tool for that proof — as long as it returns a real type at the end instead of `any`.

## 3. Walking through the original code

The schema is data, and that part is genuinely good:

```ts
export type FieldType = 'string' | 'number' | 'boolean';
export type Schema = Record<string, FieldType>;

export const userSchema: Schema = { name: 'string', age: 'number', active: 'boolean' };
```

`validate()` walks it with `Object.entries` and compares `typeof record[field]` against each declared kind. Correct code. And then:

```ts
export function validate(schema: Schema, value: unknown): any {
  ...
  return record;
}
```

`: any`. Everything downstream is unchecked:

```ts
export const user = validate(userSchema, payload);
export const shout = user.nmae.toUpperCase(); // compiles; throws
export const city = user.address.city;        // compiles; throws
```

The second half of the file is the "fix":

```ts
export interface User { name: string; age: number; active: boolean; email: string; }
export const typedUser = validate(userSchema, payload) as User;
export const domain = typedUser.email.split('@')[1];
```

`email` is in the interface and not in the schema. `validate()` never checks it. `as User` overrides the compiler's doubt (exercise 14). The line throws on data that passed validation.

## 4. What's wrong with it (in beginner terms)

**Bug story 1 — the checked-then-unchecked payload.** The whole point of validating at the boundary is to *earn* trust for the code after it. Returning `any` spends that trust before it's collected: `user.nmae` (an L-for-M typo) sails through, and the crash lands in a template three files away, where nobody's looking for a validation problem.

**Bug story 2 — the field that only exists in the type.** Someone adds `email` to `interface User` because a new screen needs it. The screen works in dev, where the fixture happens to have an email. In production, half the records predate the field. `typedUser.email.split('@')` throws — on data the logs say *passed validation*, because the schema and the interface are two different documents and only one of them runs.

**Bug story 3 — the drift nobody sees.** The same problem in reverse: add `role: 'string'` to `userSchema` and the interface doesn't know. Now `user.role` is a compile error on data you already validated, so someone "fixes" it with another cast, and the two documents drift a little further apart.

**Why discipline can't save this:** keeping two descriptions in sync is a chore assigned to whoever is least likely to remember — the person in a hurry. The only durable fix is to have one description.

## 5. Try it yourself first!

1. **Vague hint:** the schema object already knows that `name` holds a string. Why can't the compiler use that? (Think about what type `userSchema` has after the `: Schema` annotation.)
2. **Warmer:** a schema field needs to carry its output type at the *type* level, not as the string `'string'`. What if each field were an object typed `Validator<T>`, where `T` is what it produces?
3. **Warmer still:** write `Infer<S> = S extends Validator<infer T> ? T : never`. Then write `s.string()`, `s.number()`, `s.boolean()` returning `Validator<string>` etc. Each `parse` does the `typeof` check and returns the value.
4. **The hard one:** `s.object(shape)` must capture `shape` exactly (generic, not annotation — section 2.4) and return `Validator<{ [K in keyof S]: Infer<S[K]> }>`. Its `parse` loops the keys and calls each field's `parse`, then makes one cast at the end.
5. **Finishing touch:** delete the hand-written `interface User` entirely and write `type User = Infer<typeof userSchema>`. If you can't delete it, the derivation isn't complete.

## 6. Understanding the refactored solution

The core is four lines:

```ts
export interface Validator<T> {
  readonly kind: string;
  readonly parse: (value: unknown, path: string) => T;
}
export type Infer<S> = S extends Validator<infer T> ? T : never;
```

`parse` is the runtime half; the `T` in its return type is the compile-time half. Same object, two jobs — that's the whole idea of the exercise.

The leaf builders are unremarkable, which is the point: `s.string()` returns a `Validator<string>` whose `parse` does the `typeof` check. `s.array(item)` is the first interesting one — it takes a `Validator<T>` and returns a `Validator<T[]>`, so the type travels one level up with the value.

`s.object()` is the payoff:

```ts
object<S extends Record<string, Validator<unknown>>>(shape: S): Validator<{ [K in keyof S]: Infer<S[K]> }>
```

Read it right to left: capture the shape exactly (2.4), map each validator to its output type (2.5), and hand back a validator for the resulting object. Nesting works for free, because `s.object({ profile: s.object({...}) })` is just an object whose field happens to be a `Validator<{ city: string }>`.

Then the two worlds meet:

```ts
export const userSchema = s.object({ name: s.string(), age: s.number(), ... });
export type User = Infer<typeof userSchema>;
export const user = userSchema.parse(payload, '$'); // : User, no cast
```

`user.name.toUpperCase()` compiles. `user.nmae` doesn't. `user.email` doesn't, because `email` isn't in the schema — and *that* is the second bug fixed at the root: a field can't exist in the type unless something validates it.

The type tests are exercise 42's utilities: `Expect<Equal<User, { name: string; age: number; ... }>>` states the derived shape exactly, so a future change to `s.object()` that quietly returns `Record<string, unknown>` fails the build instead of degrading in silence.

One honest note: `parse()` contains a cast (`out as {...}`). That's exercise 20's contained unsafety — one cast, inside the library, sitting directly under the loop that justifies it, behind an exact public signature. The alternative is no library at all.

## 7. Words you learned (glossary)

- **Schema** — a description of a data shape, here written as a runtime value.
- **Validator** — a function or object that checks unknown data against a schema and returns it typed.
- **Type inference from values** — deriving a static type from a runtime value with `typeof` plus type-level machinery.
- **`Infer<S>`** — this project's conditional type that extracts a validator's output type.
- **`infer` keyword** — pattern-matches inside a conditional type and names the matched piece (exercise 27).
- **`typeof value` (type position)** — the bridge from the value world to the type world.
- **Generic capture** — using a type parameter so an argument's exact type survives instead of widening to its annotation.
- **Widening** — the compiler replacing a specific type with a more general one (exercise 31).
- **Mapped type** — `{ [K in keyof T]: ... }`, a loop over a type's keys (exercise 25).
- **Homomorphic** — a mapped type that preserves the source's structure (keys, modifiers, arrayness).
- **Source of truth** — the single definition everything else is derived from.
- **Drift** — two copies of one idea slowly disagreeing.
- **Contained unsafety** — confining necessary casts to one audited place behind an exact signature (exercise 20).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. In `refactored/schema.ts`, delete `age: s.number()` from `userSchema`. **Expected:** ❌ the `Expect<Equal<User, {...}>>` test fails, *and* the `// @ts-expect-error — user.age.toUpperCase()` line reports "Unused '@ts-expect-error'" (there's no `age` left to misuse). One edit to the schema, two honest complaints — that's the type test turning a data change into a reviewable diff.
2. Change `s.object()`'s parameter from the generic `shape: S` to an annotated `shape: Record<string, Validator<unknown>>` (and the return to `Validator<Record<string, unknown>>`). **Expected:** ❌ everything downstream collapses — `user.name` errors, the equality test fails. This is section 2.4's widening, felt rather than read.
3. Add `email: s.string()` to `userSchema`. **Expected:** ❌ the `// @ts-expect-error — user.email` test now reports "Unused '@ts-expect-error'", and the exact-shape test fails. Both are *correct* failures: you changed the shape, so the assertions about the shape must change too. Update them and watch `user.email.toLowerCase()` start working with no cast anywhere.
4. Write `type Bad = Infer<{ parse: (v: unknown) => number }>` and hover it. **Expected:** `never` — no `kind` property, so it isn't a `Validator` and there's nothing to infer. Now add `kind: string` to the object type: **Expected:** `number`. Structural typing (exercise 29's 2.1) means anything *shaped* like a validator counts, and `extends` is asking exactly that question.
5. Try `s.array(s.object({ id: s.number() }))` and hover the result. **Expected:** `Validator<{ id: number }[]>` — the builders compose to arbitrary depth without a single new line of type-level code, because each one only has to describe its own level.
6. In `original.ts`, change `validate`'s return type from `any` to `unknown`. **Expected:** ❌ every use site errors at once. That's the honest starting point the refactor builds from — `unknown` tells the truth, `any` tells you what you want to hear.
