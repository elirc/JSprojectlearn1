# 📘 Learning Guide: Utility Types

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

You have one main type, `User`. Real apps need *variations* of it: "User but every field optional" (for updates), "just the public fields" (for API responses), "User without the server-made fields" (for creation forms).

The original file builds each variation by **hand-copying** the interface and editing it. Copies go stale: someone added `createdAt` to `User` and forgot to update the copies, and one copy has a typo (`rol` instead of `role`).

TypeScript ships **utility types** — `Partial`, `Pick`, `Omit`, `Record` — that *compute* these variations from the original. A computed variation can never go stale, because it isn't a copy: it's a formula.

## 2. Concepts you need first

### 2.1 `interface` vs `type` — two ways to name a shape

An `interface` names an object shape. A `type` alias names *any* type, including computed ones:

```ts
interface User { id: number; name: string }
type UserCopy = User;              // ✅ OK — an alias
type Small = Pick<User, 'id'>;     // ✅ OK — a COMPUTED type
```

Utility types produce computed types, so the variations in this exercise are declared with `type`, not `interface`.

### 2.2 Optional properties — `?`

A `?` after a property name means "this property may be missing":

```ts
interface Update { name?: string }
const a: Update = {};                 // ✅ OK — name may be absent
const b: Update = { name: 'Ada' };    // ✅ OK
const c: Update = { nmae: 'Ada' };    // ❌ Error: unknown property 'nmae'
```

### 2.3 Union types and literal types

A **literal type** is a type that is one exact value, like `'admin'`. A **union** combines options with `|`. (Explained fully in exercise 06's LEARN.md.)

```ts
type Role = 'admin' | 'member';
const r: Role = 'admin';   // ✅ OK
const s: Role = 'boss';    // ❌ Error: not in the union
```

### 2.4 Generics — filling in a blank

Utility types are generics: `Partial<User>` means "run the `Partial` formula with `User` plugged in." (Generics are explained fully in exercise 16's LEARN.md.)

### 2.5 The four utility types themselves

**`Partial<T>`** — same shape, every property optional:

```ts
interface User { id: number; name: string }
const patch: Partial<User> = { name: 'Ada' };  // ✅ OK — id omitted
const bad: Partial<User> = { nmae: 'Ada' };    // ❌ Error: unknown key
```

**`Pick<T, K>`** — keep only the listed keys. The key list is *checked*:

```ts
type Mini = Pick<User, 'id'>;        // { id: number }
type Oops = Pick<User, 'idd'>;       // ❌ Error: 'idd' is not a key of User
```

**`Omit<T, K>`** — the opposite: everything *except* the listed keys:

```ts
type NoId = Omit<User, 'id'>;        // { name: string }
```

**`Record<K, V>`** — an object type with keys of type `K` and values of type `V`:

```ts
type NamesById = Record<number, string>;
const n: NamesById = { 1: 'Ada', 2: 'Grace' };  // ✅ OK
```

### 2.6 Composition — formulas stack

Utility types produce ordinary types, so you can feed one into another:

```ts
type PublicPatch = Partial<Pick<User, 'name'>>;
// "just name, and it's optional" — read inside-out
```

### 2.7 Spread syntax (runtime, not types)

`{ ...user, ...update }` builds a new object: all of `user`'s properties, then `update`'s properties written on top. It pairs perfectly with `Partial<T>` for applying patches.

### 2.8 Excess property checking

When you write an object literal directly against a typed slot, TypeScript rejects *extra* properties:

```ts
type Pub = Pick<User, 'id' | 'name'>;
const p: Pub = { id: 1, name: 'Ada', email: 'a@b' };
// ❌ Error: 'email' does not exist in type Pub
```

This is why "PublicUser must not leak email" can be a compile-time rule.

## 3. Walking through the original code

The source of truth:

```ts
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'member';
  createdAt: Date;
}
```

First hand-copy — the PATCH shape:

```ts
export interface UserUpdate {
  id?: number;
  username?: string;
  email?: string;
  role?: 'admin' | 'member';
  // createdAt forgotten — added to User later, never propagated here
}
```

Someone retyped every field with `?`. Later, `createdAt` was added to `User` — and nobody remembered this copy exists. It is now stale, and the compiler has no idea, because the two interfaces are unrelated as far as it knows.

Second copy — the public API shape:

```ts
export interface PublicUser {
  id: number;
  username: string;
  rol: 'admin' | 'member'; // typo'd during the copy
}
```

`rol`. A third spelling of the field now lives in the codebase, and it compiles fine, because `PublicUser` is its own independent interface — nothing ties it back to `User`.

Third copy, `NewUser`, is also missing `createdAt` — but here's the sneaky part: is that missing *on purpose* (the server sets it) or by accident? A hand-copy can't tell you. It records a moment in time, not an intent.

## 4. What's wrong with it (in beginner terms)

**Bug story 1 — the stale patch.** Your PATCH endpoint uses `UserUpdate`. A teammate adds `createdAt` to `User`. Nothing errors. Months later someone needs to backfill creation dates via PATCH — and can't, and nobody knows why the field "isn't supported." The copy silently fell behind.

**Bug story 2 — the `rol` typo.** Frontend code does `if (publicUser.rol === 'admin')` in one file and `user.role` in another. Both compile (each against its own interface). Then someone "fixes" the API to send `role`, and the admin check silently becomes `undefined === 'admin'` — always false. Admin buttons vanish. No error anywhere.

**Bug story 3 — the scavenger hunt.** Renaming `username` to `handle` means finding and editing five interfaces by hand. Miss one, and it drifts like the others.

The root cause: the four variations *should be functions of `User`*, but they were written as independent snapshots. Independent things drift.

## 5. Try it yourself first!

1. **Vague hint:** none of the four variation interfaces should exist as hand-written lists of fields. Each is expressible as a formula over `User`.
2. **Warmer:** the four formulas you need are exactly the four utility types in section 2.5. Match each variation to one: "all optional" → ?, "only these" → ?, "all but these" → ?, "keys of one type, values of another" → ?.
3. **Almost there:** `UserUpdate = Partial<User>`, `PublicUser = Pick<User, ...>`, `NewUser = Omit<User, ...>`, `UserIndex = Record<number, string>`. Decide which keys `Pick` keeps and which keys `Omit` drops — and notice how the `Omit` list *documents* which fields are server-assigned.

## 6. Understanding the refactored solution

Each shadow became one line:

```ts
export type UserUpdate = Partial<User>;
export type PublicUser = Pick<User, 'id' | 'username' | 'role'>;
export type NewUser = Omit<User, 'id' | 'createdAt'>;
export type UserIndex = Record<number, string>;
```

Why this is better than copies:

- **Self-updating.** Add `avatarUrl: string` to `User`: `UserUpdate` gains an optional `avatarUrl` automatically; `NewUser` gains a required one; `PublicUser` doesn't expose it unless you deliberately add it to the `Pick` list. Each formula updates *according to its own intent*.
- **Typo-proof.** `Pick<User, 'rol'>` is a compile error — the key list is checked against `User`. The original's copy-typo is now impossible to write.
- **Intent-recording.** `Omit<User, 'id' | 'createdAt'>` *says* "these two are excluded on purpose." The hand-copy just silently lacked them.

They compose:

```ts
export type PublicUserUpdate = Partial<Pick<User, 'username' | 'role'>>;
```

Read inside-out: pick two fields, then make them optional.

The usage functions show the shapes doing real work — `applyUpdate` merges a `Partial<User>` over a `User` with spread; `createUser` takes a `NewUser` and adds the server-assigned fields.

The type tests at the bottom deserve a look:

```ts
// @ts-expect-error — PublicUser excludes email: leaks are compile errors
export const leak: PublicUser = { id: 1, username: 'ada', role: 'admin', email: 'a@b' };
```

That's a *security property* checked by the compiler: accidentally including a private field in the public shape won't compile.

## 7. Words you learned (glossary)

- **Utility type** — a built-in generic type that computes a new type from an existing one.
- **`Partial<T>`** — `T` with every property optional.
- **`Pick<T, K>`** — only the properties of `T` named in `K`.
- **`Omit<T, K>`** — all properties of `T` *except* those named in `K`.
- **`Record<K, V>`** — an object type with keys `K` and values `V`.
- **Type alias (`type`)** — a name for any type, including computed ones.
- **Literal type** — a type that is one exact value, like `'admin'`.
- **Optional property (`?`)** — a property that may be missing.
- **Source of truth** — the single definition others should derive from.
- **Drift / rot** — copies gradually disagreeing with their original.
- **Excess property check** — TypeScript rejecting extra keys in an object literal.
- **Spread (`...`)** — runtime syntax that copies an object's properties into a new object.
- **Composition** — feeding one type formula into another, like `Partial<Pick<...>>`.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change, then undo it.

1. Add `avatarUrl: string;` to `User` in `refactored/users.ts`. **Expected:** `createUser` errors (its return no longer satisfies `User` — `input` lacks `avatarUrl`) while `UserUpdate` and `PublicUser` adjust silently. Watch which formulas react and which don't, and why.
2. Add `'email'` to the `Pick` list in `PublicUser`. **Expected:** the `leak` type test errors with "Unused '@ts-expect-error'" — you just made the leak legal, and the test caught you. Also `toPublic` now errors for not returning `email`.
3. Change `NewUser` to `Omit<User, 'id'>` (stop omitting `createdAt`). **Expected:** the `createUser` call sites and the `sneakyId` test still behave, but any object literal of type `NewUser` now *requires* `createdAt` — try writing one to see.
4. Write `type Broken = Pick<User, 'id' | 'nickname'>;` anywhere. **Expected:** error — `'nickname'` is not a key of `User`. This is the drift-proofing in action.
5. Recreate the original bug on purpose: write `interface HandMade { id?: number }` and compare it to `Partial<Pick<User, 'id'>>` by assigning values between them. **Expected:** they're assignment-compatible today — the difference isn't what they *are* now, it's that only one of them updates when `User` changes.
