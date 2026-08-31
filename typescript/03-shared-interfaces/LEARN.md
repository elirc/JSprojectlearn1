# 📘 Learning Guide: Shared Interfaces

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Four small functions all work with "a user": greet them, get their initials, check if they can export data, build an email link.

The type-level problem: each function describes the user's shape *inline*, inside its own parentheses — four separate copies of what a user is. And the copies have already drifted apart: one has an extra field the others don't know about, and one has a typo in a field name. Everything compiles, because nothing ever forces the four copies to agree. The lesson: give a shape ONE name, defined in ONE place.

## 2. Concepts you need first

### Object types (describing shapes)

In TypeScript you can describe an object's shape — its property names and their types — right where you use it. This is an **inline object type**:

```ts
function greet(user: { name: string; email: string }): string {
  return `Hi ${user.name}`;
}
greet({ name: "Ada", email: "a@b.dev" });  // ✅ OK
greet({ name: "Ada" });                     // ❌ Error: Property 'email' is missing
```

The `{ name: string; email: string }` part IS the type — written anonymously, in place.

### Interfaces (naming a shape)

An **interface** gives that shape a name you can reuse:

```ts
interface User {
  name: string;
  email: string;
}
function greet(user: User): string { return `Hi ${user.name}`; }
function initials(user: User): string { return user.name[0] ?? ""; }
```

Now both functions point at the *same* definition. Change `User`, and both functions' contracts change together.

### Structural typing (how TypeScript compares types)

TypeScript doesn't care what a type is *named* — it cares what shape it *has*. Two types with the same properties are interchangeable:

```ts
interface A { x: number }
interface B { x: number }
const a: A = { x: 1 };
const b: B = a;   // ✅ OK — same shape, names don't matter
```

This is called **structural typing**. Important consequence for this exercise: four inline types that happen to match will work together *by luck* — and the moment one copy changes, the luck runs out, with no warning at the place that changed.

### Why the error appears in the "wrong" place

When a caller passes an object that doesn't match a function's parameter type, the error points at the **call site** (the caller's object), not at the function:

```ts
function f(user: { emial: string }) { /* typo'd signature */ }
f({ email: "a@b.dev" });
// ❌ Error AT THIS LINE: Property 'emial' is missing in type '{ email: string; }'
```

The bug is in the signature, but the compiler blames the (correct!) caller. This misdirection is central to this exercise.

### Literal union types (a small preview)

You'll see this in the solution:

```ts
plan: 'free' | 'pro'
```

This means: the `plan` property must be exactly the string `'free'` or exactly the string `'pro'` — nothing else. It's called a **literal union** (exercise 06 explores it fully). It's stricter than `string`, which would accept any text including typos.

### `interface` vs `type` (you'll see both in this track)

Two keywords can name types. For object shapes they're nearly interchangeable:

```ts
interface User { name: string }
type User2 = { name: string };   // same effect for this purpose
```

This track's convention: `interface` for object shapes, `type` for unions and combinations. Don't sweat the difference yet.

## 3. Walking through the original code

Open `original.ts`. The first two functions agree:

```ts
export function greet(user: { name: string; email: string }): string { ... }
export function initials(user: { name: string; email: string }): string { ... }
```

Same inline shape, written twice. Copy-paste, but in types.

The third copy drifted:

```ts
export function canExport(user: { name: string; email: string; plan: string }): boolean {
  return user.plan === 'pro';
}
```

Someone needed a `plan` field and added it *here only*. Now "a user" means something different to this function than to the other two.

The fourth copy has a typo:

```ts
export function mailtoLink(user: { name: string; emial: string }): string {
  return `mailto:${user.emial}`;
}
```

`emial` instead of `email`. This compiles! It's not wrong TypeScript — it's just a *different type* that no real user object will ever match.

Then the call sites pay the price:

```ts
const ada = { name: 'Ada Lovelace', email: 'ada@engine.dev' };
export const canAdaExport = canExport({ ...ada, plan: 'pro' });
export const link = mailtoLink({ name: ada.name, emial: ada.email });
```

`canExport(ada)` errored (ada has no `plan`), so the caller *invented* data at the call site — spreading ada and bolting on `plan: 'pro'`. And to call `mailtoLink`, the caller had to build a special object with the misspelled field, spreading the typo further instead of fixing it.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — four definitions of one concept.** "User" is a single idea in this app, but it's described four times. TypeScript checks each function against its own inline copy; nothing checks the copies against each other. It's exactly like copy-pasting a function four times: the copies WILL drift, and here two already have.

**Flaw 2 — the typo survives and spreads.** Here's the runtime story: `mailtoLink` has `emial` in its signature. A teammate calls `mailtoLink(ada)` and gets a confusing error saying *their* object is missing `emial`. The error points at their correct code, not at the buggy signature. Deadline pressure. They "fix" it by renaming their field to `emial` too. Now the typo exists in two files, then five, then the app renders `mailto:undefined` links in production because some other path still uses `email`. The compiler never objected once — every individual piece was self-consistent.

**Flaw 3 — call-site data invention.** `canExport({ ...ada, plan: 'pro' })` hardcodes `'pro'` at the call site just to satisfy the type. Now the code claims Ada is a pro user whether or not she is — data made up to silence the compiler.

**Flaw 4 — renames are manual hunts.** Want to rename `email` to `emailAddress`? With inline types, you grep and hope you found every copy. With one named interface, the compiler lists every place that needs updating.

## 5. Try it yourself first!

1. **Vague hint:** Count how many times the user's shape is written out in this file. How many *should* there be?
2. **Warmer:** Two of the four copies are broken in different ways. Find the extra field and find the typo.
3. **Warmer still:** Write a single `interface User` at the top of the file containing everything a user genuinely needs: `name`, `email`, and `plan`.
4. **Specific:** Change all four signatures to `(user: User)`. The compiler will now show you errors — read each one carefully: they point at the real bugs (the `emial` usage inside `mailtoLink`, and the call sites that were compensating).
5. **Polish:** Make `plan` stricter than `string` — only `'free'` and `'pro'` are real plans. The syntax is `plan: 'free' | 'pro'`.

## 6. Understanding the refactored solution

Open `refactored/user.ts`.

**One interface, one authority:**

```ts
export interface User {
  name: string;
  email: string;
  plan: 'free' | 'pro';
}
```

Every function now takes `user: User`. The interface is the single spelling authority: writing `user.emial` inside any of these functions is now a compile error *inside that function* — exactly where the bug lives, not at some innocent caller.

**`plan` is a literal union.** Not `string` — only `'free' | 'pro'`. A typo like `'Pro'` or `'premium'` is a compile error. This previews exercise 06.

**The call sites got honest:**

```ts
const ada: User = { name: 'Ada Lovelace', email: 'ada@engine.dev', plan: 'pro' };
export const canAdaExport = canExport(ada);
```

Ada is declared as a `User` once, with her real plan, and every function accepts her directly. No spreading, no invented fields, no misspelled duplicates.

**The type tests pin the old bugs:**

```ts
// @ts-expect-error — a User without a plan is not a User (no drift)
export const notAUser: User = { name: 'X', email: 'x@x.dev' };

// @ts-expect-error — the typo'd field is rejected at the source
export const typoUser: User = { name: 'X', emial: 'x@x.dev', plan: 'free' };
```

These lines are *required to fail compilation*. If someone later makes `plan` optional or loosens the type, these tests break the build.

**When are inline types okay?** For a one-off shape used exactly once (like an options object only one function touches). The moment a shape appears twice, or *means* something ("a User"), name it.

## 7. Words you learned (glossary)

- **Inline object type** — a shape written anonymously in place: `(user: { name: string })`.
- **Interface** — a named, reusable description of an object shape.
- **Structural typing** — TypeScript compares types by shape, not by name.
- **Drift** — copies of the same idea gradually becoming different as code evolves.
- **Call site** — the line of code where a function is called.
- **Signature** — a function's parameter types and return type; its contract.
- **Literal union** — a type listing exact allowed values: `'free' | 'pro'`.
- **Single source of truth** — one authoritative definition that everything else references.
- **`type` alias** — the other keyword for naming types; interchangeable with `interface` for object shapes.
- **`@ts-expect-error`** — a comment asserting the next line must fail to compile.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change. Undo between experiments.

1. **In `refactored/user.ts`**, rename `email` to `emailAddress` in the `User` interface. Expected: ❌ errors at every usage — `greet`, `mailtoLink`, and the `ada` object — a compiler-generated todo list for the rename. (This is the "renames become guided refactors" benefit. Undo after admiring.)
2. **In `refactored/user.ts`**, add a field to `User`: `id: number;`. Expected: ❌ one error — the `ada` object is missing `id`. Every function updated its contract automatically; only the data needs a touch.
3. **In `refactored/user.ts`**, change `plan: 'free' | 'pro'` to `plan: string`. Expected: ❌ error — the `@ts-expect-error` on `typoUser`... wait, no: `typoUser` fails for the `emial` field, so it still errors correctly. But now try adding `const oops: User = { name: 'X', email: 'x@x.dev', plan: 'premuim' };` — ✅ it compiles with `string`, silently accepting the typo. Restore the union and it becomes ❌ an error.
4. **In `refactored/user.ts`**, change `ada`'s plan to `plan: 'premium'`. Expected: ❌ error — "Type '"premium"' is not assignable to type '"free" | "pro"'." The union catches invalid data at the declaration.
5. **In `original.ts`** (just read, don't save changes): imagine adding `phone: string` to the user concept. Count the number of places you'd have to edit. Now count in `refactored/user.ts`. That ratio is the whole lesson.
