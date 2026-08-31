# 📘 Learning Guide: Typed Validator

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

This exercise is about a **form validator**. A validator is code that checks user input: "is the username long enough?", "did they fill in the email?". It collects error messages like `"must be at least 8 characters"`.

The validator here *works* at runtime. The problem is type-level: the **schema** (the list of rules for each field) is supposed to match the shape of the form data, but nothing checks that they match. So the schema can validate a field that doesn't exist (`emial` — a typo) while the real field (`email`) goes completely unchecked. The compiler says nothing.

The fix: write types so the schema is *derived from* the form's shape. Then any mismatch becomes a red squiggle instead of a silent bug.

## 2. Concepts you need first

### 2.1 `any` — the type that turns checking off

`any` means "trust me, don't check this." Anything goes in, anything comes out, and every mistake compiles:

```ts
let x: any = 'hello';
x.toUpperCase();   // ✅ OK
x.spellCheck();    // ✅ OK too — but this CRASHES at runtime,
                   //    because strings have no spellCheck method
```

Once a value is `any`, the compiler stops protecting you around it.

### 2.2 Generics — types with blanks to fill in

A **generic** is a type or function with a placeholder (usually `T`) that gets filled in later. (Explained fully in exercise 16's LEARN.md.) Quick refresher:

```ts
type Box<T> = { value: T };
const a: Box<number> = { value: 42 };    // ✅ OK
const b: Box<number> = { value: 'hi' };  // ❌ Error: string is not number
```

### 2.3 Function types — describing a function's shape

You can write a type that says "a function that takes X and returns Y":

```ts
type Rule = (value: string) => string | null;
const ok: Rule = (v) => (v === '' ? 'is required' : null); // ✅ OK
const bad: Rule = (v: number) => null; // ❌ Error: number is not string
```

Here `string | null` is a **union type**: the return value is either a string (an error message) or `null` (meaning "no error").

### 2.4 `keyof` — the list of a type's property names

`keyof T` gives you a union of all the property names (keys) of `T`:

```ts
interface Signup { username: string; age: number }
type Keys = keyof Signup; // 'username' | 'age'
const k: Keys = 'username'; // ✅ OK
const bad: Keys = 'emial';  // ❌ Error: not a key of Signup
```

### 2.5 Indexed access — `T[K]` looks up a property's type

Just like `obj[key]` gets a value, `T[K]` gets a *type*:

```ts
interface Signup { username: string; age: number }
type A = Signup['username']; // string
type B = Signup['age'];      // number
```

### 2.6 Mapped types — a loop over keys (the star of this exercise)

A **mapped type** builds a new object type by looping over the keys of another one. Read `[K in keyof T]` as "for each key K of T":

```ts
interface Signup { username: string; age: number }
type Stringy<T> = { [K in keyof T]: string };
type S = Stringy<Signup>; // { username: string; age: string }
```

Add a `?` after the bracket and every property becomes **optional** (allowed to be missing):

```ts
type Loose<T> = { [K in keyof T]?: string };
const l: Loose<Signup> = {};                 // ✅ OK — everything optional
const m: Loose<Signup> = { emial: 'typo' };  // ❌ Error: unknown key
```

The key insight: a mapped type can only ever have the keys of `T`. Typos and ghost fields are rejected automatically. (Exercise 25's LEARN.md goes much deeper on mapped types.)

### 2.7 Type predicates — `x is string`

Inside `.filter()`, TypeScript doesn't automatically know you removed the `null`s. A **type predicate** is a return type shaped like `value is SomeType` that tells the compiler "if I return true, the value is that type":

```ts
const mixed: (string | null)[] = ['a', null, 'b'];
const strings = mixed.filter((m): m is string => m !== null);
// strings: string[]  — the nulls are gone, and the TYPE knows it
```

### 2.8 Type assertions (`as`) — overriding the compiler

`as` tells the compiler "treat this as that type, trust me." It does nothing at runtime; it just silences checking. It is dangerous in general, but sometimes needed in small, contained spots — you'll see one in the refactor.

## 3. Walking through the original code

Open `original.ts`. First, the rule factories:

```ts
export const required = () => (value: any) =>
  value === undefined || value === null || value === '' ? 'is required' : null;
```

`required()` is a function that *returns* a function (a "rule"). The rule takes a value and returns an error message or `null`. But `value: any` means the rule accepts *anything* — a string, a number, a date — with no checking.

The engine:

```ts
export function validate(data: any, schema: any): Record<string, string[]> {
```

Both parameters are `any`. `Record<string, string[]>` means "an object whose keys are any strings and whose values are arrays of strings." So the errors object can be read with *any* key, real or not.

The schema:

```ts
export const signupSchema = {
  username: [required(), minLength(3)],
  emial: [required()],          // TYPO
  password: [required(), minLength(8)],
  favoriteColor: [required()],  // field that doesn't exist
};
```

`Signup` has `username`, `email`, `password`. This schema validates `emial` (a typo — so the real `email` is never checked) and `favoriteColor` (which `Signup` doesn't even have). The compiler accepts all of it, because `validate` takes `any`.

And the last line:

```ts
export const usernameErrors = errors.usrename; // typo'd read
```

Another typo — `usrename`. It compiles and silently gives `undefined`.

## 4. What's wrong with it (in beginner terms)

**Bug story 1 — the unchecked email.** A user types `not-an-email` into the email box. The schema's rule is attached to `emial`, which the form doesn't have, so `data['emial']` is `undefined`... and the *real* email is never looked at. The bad email sails into your database. The validator ran, reported success-ish, and validated nothing. That is "confidently unvalidated data" — worse than no validator, because you *trusted* it.

**Bug story 2 — the ghost field.** `favoriteColor: [required()]` always fails (the form never has that field), producing an error about a field the user can't even see or fix.

**Bug story 3 — the typo'd read.** `errors.usrename` returns `undefined`. Code like `if (errors.usrename) showError(...)` simply never fires. The UI silently never shows username errors.

The common cause: the schema is *supposed to mirror* the `Signup` type, but that mirroring is only a convention — a hope. Nothing enforces it.

## 5. Try it yourself first!

Try fixing `original.ts` (in your head or a scratch file) before reading on.

1. **Vague hint:** the schema should not be typed loosely — it should be typed *in terms of* `Signup`.
2. **Warmer:** write a `Rule<T>` type first: a function from `T` to `string | null`. Then think: what type should the whole schema object have?
3. **Warmer still:** you want "an object whose keys are exactly the keys of `Signup`, each holding an array of rules for *that field's* type." That sentence is a mapped type: `[K in keyof T]`.
4. **Almost there:** `type Schema<T> = { [K in keyof T]?: Rule<T[K]>[] }`. Note the `?` (you may skip fields) and `T[K]` (each rule is typed for its own field). Do the same trick for the errors object.

## 6. Understanding the refactored solution

Open `refactored/validator.ts`. Three small types carry the whole design:

```ts
export type Rule<T> = (value: T) => string | null;

export type Schema<T> = {
  [K in keyof T]?: Rule<T[K]>[];
};

export type Errors<T> = {
  [K in keyof T]?: string[];
};
```

- `Rule<T>`: a check for a value of type `T`. A `Rule<string>` and a `Rule<number>` are different types — so a string rule can't guard a number field.
- `Schema<T>`: for each key of `T`, an optional array of rules *typed for that key's value*. This one line is the entire fix. `emial` isn't a key of `Signup`, so it can't appear. `favoriteColor` can't either. And `age: [minLength(3)]` fails because `minLength` makes a `Rule<string>` but `age` is a `number`.
- `Errors<T>`: errors can only be stored (and *read*) under real field names — so `errors.usrename` is now a compile error too.

Notice the rule factories got **simpler**:

```ts
export const required = (): Rule<string> => (value) =>
  value === '' ? 'is required' : null;
```

The original probed with `typeof value === 'string'` because it could receive anything. Now the type guarantees `value` is a string, so the runtime sniffing is gone. Better types often mean *less* code.

The engine has one honest compromise:

```ts
for (const key of Object.keys(schema) as (keyof T)[]) {
```

`Object.keys` always returns `string[]` in TypeScript (by design — an object could have extra keys at runtime). The `as (keyof T)[]` assertion says "in this sealed loop, treat them as keys of T." It's contained: the public signature of `validate` is fully checked, and the cast lives in one audited line.

Finally, the `// @ts-expect-error` lines at the bottom are **type tests**: each one asserts that the line *fails* to compile. If someone weakens the types later so a bad line starts compiling, `tsc` flags the now-unused `@ts-expect-error` — a real failing test, run by the compiler.

## 7. Words you learned (glossary)

- **Validator** — code that checks input data and collects error messages.
- **Schema** — a description of what rules apply to which fields.
- **`any`** — a type that disables all checking for a value.
- **Generic** — a type/function with a placeholder type (like `T`) filled in later.
- **Union type** — a type that is one of several options, e.g. `string | null`.
- **`keyof T`** — the union of `T`'s property names.
- **Indexed access (`T[K]`)** — looking up the type of property `K` on `T`.
- **Mapped type** — `{ [K in keyof T]: ... }`, a compile-time loop over keys.
- **Optional property (`?`)** — a property allowed to be missing.
- **Type predicate** — a return type `x is Y` that teaches the compiler what a boolean check proves.
- **Type assertion (`as`)** — manually overriding the compiler's opinion of a type.
- **`Record<K, V>`** — an object type with keys `K` and values `V`.
- **Type test / `@ts-expect-error`** — a line that must *fail* to compile; the compiler errors if it ever starts passing.
- **Drift** — when two things that should mirror each other slowly stop matching.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change, then undo it.

1. In `refactored/validator.ts`, add `nickname: [required()]` to `signupSchema`. **Expected:** error — `nickname` is not a key of `Signup`. Now add `nickname: string;` to the `Signup` interface too. **Expected:** clean.
2. Change `age: [min(13)]` to `age: [minLength(3)]`. **Expected:** error — `Rule<string>` is not assignable where `Rule<number>[]` is required. That's the key↔rule correlation working.
3. Delete the `?` in `Schema<T>` (making every field's rules required). **Expected:** any schema that skips a field now errors — try removing `age` from `signupSchema` to see it.
4. Change one type test, e.g. fix `emial` to `email` on the `typoSchema` line. **Expected:** error "Unused '@ts-expect-error' directive" — proof the type tests are real tests.
5. In `Errors<T>`, change `string[]` to `string`. **Expected:** the engine's `errors[key] = fieldErrors` line errors, because `fieldErrors` is a `string[]`. Types ripple: change a contract and every violation lights up.
