# 📘 Learning Guide: The API Boundary

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Your program talks to a server: it asks for a user, the server sends back JSON. You write an `interface User` describing what that JSON looks like. But here's the uncomfortable truth: **your interface is only a memory of what the server sent last time you checked.** The server can change (rename a field, drop one), and your types will keep describing the old world — while claiming to be certain.

The original code papers over that gap with a **cast** (`data as User`), which tells the compiler "trust me." The refactor replaces trust with a **schema**: a small object that both *checks* the data at runtime and *carries* the type at compile time — one definition doing both jobs, so they can never drift apart.

## 2. Concepts you need first

### What an "API boundary" is
An **API** (Application Programming Interface) is any service your code calls — here, a fake network function standing in for a real server. The **boundary** is the exact line where data from *outside* your program (which you don't control) enters *your* typed code. Everything inside the boundary can be trusted-by-compiler; everything crossing it must be checked, because the compiler cannot see what a server will send at 3am next Tuesday.

### `unknown` — the honest "I don't know" type
`unknown` means "some value, no promises." You cannot use it until you check it:

```ts
const data: unknown = JSON.parse('{"id": 7}');
data.id;                      // ❌ Error: 'data' is of type 'unknown'
if (typeof data === 'string') {
  data.toUpperCase();         // ✅ OK — checked first
}
```

Compare with `any`, which means "stop checking me" and lets everything through. `unknown` is the safe one: it forces a check before use.

### Type assertions (`as`) — and why they lie
`data as User` is a **type assertion** (a "cast"). It performs *no check at runtime*. It is you overriding the compiler:

```ts
const data: unknown = { mail: 'x@y.z' };   // note: no 'email' field
const user = data as { email: string };    // ✅ compiles — no questions asked
user.email.toLowerCase();                  // 💥 crashes at RUNTIME
```

The compiler believed you. The data didn't care.

### Type guards (`value is T`)
A **type guard** is a normal function whose return type is a special claim: `value is string` means "if I return true, treat value as a string from here on."

```ts
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
const x: unknown = 'hi';
if (isString(x)) {
  x.toUpperCase(); // ✅ OK — the compiler narrowed x to string
}
```

"**Narrowing**" is the compiler shrinking a broad type (like `unknown`) to a precise one inside a checked branch. (Exercise 11's folder covers guards in depth.)

### Schemas: a guard bundled with a type
A **schema** is a value that describes a shape of data and can validate it. In this exercise it's tiny:

```ts
interface Schema<T> {
  name: string;                            // for error messages
  check: (value: unknown) => value is T;   // the guard
}
```

The generic `T` is the compile-time half; `check` is the runtime half. One object, both worlds. Real libraries (zod, valibot) are industrial versions of exactly this.

### Mapped types correlating fields to checkers
The clever core of `objectSchema` is its parameter type:

```ts
{ [K in keyof T]: (value: unknown) => value is T[K] }
```

Read: "for every property K that T has, give me a guard that checks *that property's type*." So if `User.email` is `string`, you must supply a string-checker for `email` — supplying `isNumber` there is a compile error. This is what makes the validator unable to drift from the interface. (Mapped types are covered fully in exercise 25's folder; here you only need the reading above.)

### Combinators
A **combinator** is a function that builds a bigger thing out of smaller things of the same kind. `arraySchema(UserSchema)` takes a schema for one user and returns a schema for an *array* of users. Small parts, composed.

### Custom error classes
A class `extends Error` gives a failure a *name* and a place to carry evidence:

```ts
class ApiDriftError extends Error {
  constructor(schemaName: string, public readonly received: unknown) {
    super(`API response is not a valid ${schemaName}`);
  }
}
```

`public readonly received` in the constructor is shorthand: it declares and assigns a field in one stroke. Now a `catch` can inspect *what* the server actually sent.

### `@ts-expect-error` — type tests
A comment asserting the next line must FAIL to compile; if the line compiles, the comment itself errors. It's how this track writes tests for types.

## 3. Walking through the original code

The interfaces look responsible:

```ts
export interface User {
  id: number;
  name: string;
  email: string;
}
```

The fake network tells the real story:

```ts
if (path === '/user/7') {
  return { id: 7, name: 'Ada', mail: 'ada@engine.dev' };
  //                           ^ v2 renamed email -> mail
}
```

The server moved on (version 2 renamed `email` to `mail`). Nobody updated the client's interface. This is not a contrived bug — it is *the* most common way typed frontends break.

The crime scene:

```ts
export async function getUser(id: number): Promise<User> {
  const data = fakeNetwork(`/user/${id}`);
  return data as User; // "the API returns a User" — it DID, in March
}
```

`fakeNetwork` honestly returns `unknown`. The `as User` cast overrides that honesty with a stale memory. From this line on, the compiler believes `email` exists.

And four layers away:

```ts
return `${user.name} <${user.email.toLowerCase()}>`;
```

`user.email` is `undefined` (the field is called `mail` now), and `.toLowerCase()` on `undefined` crashes — in code that looks completely innocent and fully typed.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the cast makes the interfaces decorative.** A type is a promise the compiler enforces *inside* your program. But `as` injects an unverified promise from outside. Story: in March the API returned `email`; the code was written and worked. In June the API team shipped v2 with `mail`. No client code changed, so nothing flagged it. The first signal was a production crash: `Cannot read properties of undefined (reading 'toLowerCase')` — pointing at `userSummary`, which did nothing wrong. The lie was told in `getUser`; the crash surfaced somewhere else entirely. That distance is what makes cast bugs expensive.

**Flaw 2: hand-rolled checks don't scale.** Exercise 13 taught the fix for one endpoint: validate `unknown` by hand. But with 30 endpoints, hand-written checkers become a *second* copy of every interface — and copies drift. You need the check and the type to be a single artifact.

**Flaw 3: when it fails, it fails in the wrong place with the wrong message.** "undefined has no toLowerCase" says nothing about APIs or versions. The refactor's `ApiDriftError` says exactly what happened, at the exact boundary where it happened.

## 5. Try it yourself first!

1. **Vague hint:** the problem is one line: `data as User`. What could replace a blind promise with an actual look at the data?
2. **Warmer:** write `function isUser(value: unknown): value is User` that checks `id`, `name`, `email` with `typeof`. Make `getUser` call it and throw if it fails. That's exercise 13's fix — now ask: how do you avoid writing one of these by hand for every interface?
3. **Warmer still:** design a `Schema<T>` object holding a `check` guard. Write `objectSchema<User>('User', { ...one small guard per field... })` that builds the object-checker for you from per-field checkers.
4. **Specific:** type the field-checkers parameter as `{ [K in keyof T]: (value: unknown) => value is T[K] }` so a wrong checker (e.g. `email: isNumber`) refuses to compile.
5. **Finishing move:** write `fetchChecked<T>(path, schema): T` that runs the check and throws a named error on failure — and notice you never wrote `as User` anywhere on the data path.

## 6. Understanding the refactored solution

The building blocks are two one-line guards:

```ts
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number => typeof value === 'number';
```

`objectSchema` assembles them. Inside, it checks the value is a non-null object, then verifies *every field* the interface declares using the matching checker:

```ts
return (Object.keys(fields) as (keyof T)[]).every((key) =>
  fields[key](record[key as string]),
);
```

(The two small `as` casts here are internal plumbing — converting between "string keys" and "keys of T" — not claims about outside data. The dangerous cast is the one that asserts what a *server* sent; these just relabel keys the code itself is iterating.)

The schema definition is where drift dies:

```ts
export const UserSchema = objectSchema<User>('User', {
  id: isNumber,
  name: isString,
  email: isString,
});
```

If someone edits `interface User` — renames `email`, changes a type — this literal no longer matches `{ [K in keyof User]: ... }` and stops compiling. The interface and validator are chained together at the wrist.

The boundary function:

```ts
export function fetchChecked<T>(path: string, schema: Schema<T>): T {
  const data = fakeNetwork(path);
  if (!schema.check(data)) {
    throw new ApiDriftError(schema.name, data);
  }
  return data; // narrowed by the guard — no cast anywhere
}
```

Note the last line: `data` started as `unknown`, but after `schema.check(data)` returned true, the guard's `value is T` narrowed it to `T`. Returning it needs no cast. The compiler's trust was *earned*, not asserted.

Downstream, `userSummary` is byte-for-byte the same as the original. The difference is entirely *where failure surfaces*: with the v2 drift in place, calling it now throws `ApiDriftError: API response is not a valid User — the API and the client have drifted`, at fetch time, naming the real culprit — instead of a mystery crash four layers later.

The two type tests at the bottom pin the design: a field checker of the wrong type doesn't compile, and `fetchChecked(...).emial` (a typo) doesn't compile because the return type is a real `User`, not `any`.

## 7. Words you learned (glossary)

- **API** — a service your code calls; here, the (fake) network.
- **Boundary** — the line where outside, unverified data enters your typed program.
- **`unknown`** — the type for "no promises"; must be checked before use.
- **`any`** — the type that disables checking; avoid it at boundaries.
- **Type assertion / cast (`as`)** — telling the compiler a type without any runtime check.
- **Type guard** — a function returning `value is T`, teaching the compiler a check.
- **Narrowing** — the compiler shrinking a type inside a checked branch.
- **Schema** — one definition that validates data at runtime and carries its type at compile time.
- **Mapped type** — a type built by looping over another type's keys (`[K in keyof T]`).
- **Correlation** — tying two things together in types (here: each field to its checker).
- **Combinator** — a function that composes small pieces into bigger ones (`arraySchema`).
- **Drift** — the API and the client's types slowly disagreeing over time.
- **`ApiDriftError`** — this exercise's named error for "validation failed at the boundary."
- **Generic (`<T>`)** — a type placeholder filled in per use.
- **`@ts-expect-error`** — a comment asserting the next line must fail to compile.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change (then undo it).

1. **Cause drift on purpose.** In `refactored/api.ts`, add a field to the interface: `age: number;` inside `User`. Expected: ❌ the `UserSchema` literal errors — "age is missing" — because the mapped type demands a checker for every field. Add `age: isNumber` to fix it. That error *is* the anti-drift guarantee firing.
2. **Wrong checker.** Change `email: isString` to `email: isNumber` in `UserSchema`. Expected: ❌ error — a number-guard is not assignable where a string-guard is required. (This is exactly what the first `@ts-expect-error` test asserts.)
3. **Build a Post schema.** Add `interface Post { id: number; title: string }` and `const PostSchema = objectSchema<Post>('Post', { id: isNumber, title: isString })`, then `arraySchema(PostSchema)`. Expected: ✅ compiles; hover the array schema — it's `Schema<Post[]>`.
4. **Break a type test.** Remove the `// @ts-expect-error` above the `drifted` line. Expected: ❌ the line under it now reports its own error — proving the test was live.
5. **Add a boolean guard.** Write `const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';` and use it in a new schema. Expected: ✅ compiles — you've extended the schema toolkit the same way real validation libraries grow.
