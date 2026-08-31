# 📘 Learning Guide: Mapped Types

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Exercise 24 taught you to use `Partial`, `Pick`, and friends instead of hand-copying types. This exercise opens the hood: those utilities are all built from **one mechanism** called a *mapped type* — a compile-time loop over a type's keys.

The problem in the original: the team uses the built-in utilities but treats them as magic. So when they need a variation the standard library *doesn't* ship ("every field wrapped in a getter function", "a boolean per field"), they fall back to hand-copying interfaces — and the drift bugs from exercise 24 come right back.

Once you can write the loop yourself, *any* "same keys, different values" shape is one line, and it maintains itself forever.

## 2. Concepts you need first

### 2.1 Quick recap of building blocks

These were introduced in earlier LEARN.md files — brief reminders only:

- **`keyof T`** (exercise 23): the union of `T`'s property names. `keyof Settings` is `'theme' | 'fontSize' | 'notifications'`.
- **Indexed access `T[K]`** (exercise 23): the type of property `K` on `T`. `Settings['fontSize']` is `number`.
- **Utility types** (exercise 24): `Partial`, `Pick`, `Readonly` — formulas over types.
- **Generics** (exercise 16): types with placeholders like `T`.

### 2.2 The mapped type itself — a loop over keys

This is the whole show. Read `{ [K in keyof T]: ... }` as: "make a new object type; for each key `K` of `T`, give it a property `K` with the type on the right."

```ts
interface Settings { theme: string; fontSize: number }

type Same<T> = { [K in keyof T]: T[K] };
// Same<Settings> = { theme: string; fontSize: number } — a clone

type AllStrings<T> = { [K in keyof T]: string };
// AllStrings<Settings> = { theme: string; fontSize: string }
```

The part before the colon (`[K in keyof T]`) is the loop. The part after is what each property's *value type* becomes. `K` is available on the right side, so you can transform per-key: `T[K]` is "this key's original type."

### 2.3 Property modifiers — `?` and `readonly`

Two markers can decorate a property:

- `?` — optional: the property may be missing.
- `readonly` — the property can be read but not assigned after creation.

```ts
interface P { readonly id: number; nickname?: string }
const p: P = { id: 1 };       // ✅ OK — nickname optional
p.id = 2;                     // ❌ Error: id is readonly
```

### 2.4 Adding modifiers inside a mapped type

A mapped type can stamp a modifier onto every property as it loops:

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };      // add ? to each
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }; // add readonly
```

That's it — you just wrote the real `Partial` and `Readonly`. The standard library versions are exactly these one-liners.

### 2.5 Removing modifiers — the `-` sign

A minus sign *strips* a modifier. This is something the built-in utilities mostly don't expose, and it's one line:

```ts
type Editable<T> = { -readonly [K in keyof T]: T[K] }; // strip readonly
type Complete<T> = { [K in keyof T]-?: T[K] };          // strip ?

interface Draft { readonly title?: string }
const d: Complete<Editable<Draft>> = { title: 'hi' }; // ✅ required & writable
const e: Complete<Editable<Draft>> = {};              // ❌ Error: title required
```

### 2.6 Looping over a subset — how `Pick` works

The loop variable doesn't have to range over *all* keys. Constrain a second type parameter to `keyof T` and loop over that:

```ts
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type JustTheme = MyPick<Settings, 'theme'>; // { theme: string }
```

`K extends keyof T` is a **generic constraint** (exercise 17 explains it fully): it means "K must be some keys of T" — which is why picking a typo'd key is a compile error.

### 2.7 Function types as values (for the getter example)

`() => number` is the type "a function taking nothing, returning a number":

```ts
const f: () => number = () => 42;  // ✅ OK
const g: () => number = 42;        // ❌ Error: a number is not a function
```

## 3. Walking through the original code

The source type:

```ts
export interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: boolean;
}
```

Hand-copy number one — "every field as a getter":

```ts
export interface SettingsGetters {
  theme: () => 'light' | 'dark';
  fontSize: () => number;
  notifications: () => boolean;
}
```

Every value type was retyped by hand, wrapped in `() =>`. The comment in the file says it: add a field to `Settings`, and you must *remember* to add its getter here. The compiler won't remind you — these two interfaces are strangers to each other.

Hand-copy number two — "which fields has the user touched":

```ts
export interface SettingsTouched {
  theme: boolean;
  fontSize: boolean;
  notifications: boolean;
}
```

Same keys as `Settings`, every value `boolean`. Also a stranger to `Settings`. The comment notes the real-world version of this is *already* one field behind.

Hand-copy number three merges "readonly" and "optional" by hand:

```ts
export interface FrozenDraft {
  readonly theme?: 'light' | 'dark';
  readonly fontSize?: number;
  readonly notifications?: boolean;
}
```

The team *knows* `Readonly` and `Partial` exist — but didn't realize they stack, so they retyped everything with both modifiers.

## 4. What's wrong with it (in beginner terms)

**The runtime bug the compiler failed to catch:** imagine `language: string` gets added to `Settings`. The settings screen adds a language dropdown. But `SettingsTouched` wasn't updated, so the "did the user touch this?" tracker has no `language` entry. Code reads `touched.language` — `undefined`, which is falsy — so the app thinks the user never touched language, and discards their choice on every save. No compiler error at any point, because the tracker interface never claimed to match `Settings`.

That's exercise 24's rot again, and it happened *even though the team uses utility types* — because the shapes they needed (`Getters`, `FlagsOf`) aren't in the standard library, and they didn't know they could build their own.

The deeper problem the README names: knowing *of* `Partial` without knowing its *mechanism* leaves you dependent on exactly the utilities someone else predicted you'd need.

## 5. Try it yourself first!

1. **Vague hint:** all three hand-written interfaces are "the keys of `Settings`, with the value types transformed by some rule." That's a mapped type each.
2. **Warmer:** the skeleton is always `type X<T> = { [K in keyof T]: ??? }`. For the getters, what goes in `???` so each value becomes a function returning the original type? For the touched-tracker, what goes there so each value is a boolean?
3. **Warmer still:** for `FrozenDraft`, don't write a loop at all — compose two utilities you already know from exercise 24.
4. **Bonus challenge:** before peeking, try writing `MyPartial<T>`, `MyReadonly<T>`, and `MyPick<T, K>` from scratch. Sections 2.4 and 2.6 have everything you need.

## 6. Understanding the refactored solution

First, the standard library rebuilt, to prove there's no magic:

```ts
export type MyPartial<T> = { [K in keyof T]?: T[K] };
export type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
export type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
```

Then the two utilities the standard library *doesn't* ship — one line each:

```ts
export type Editable<T> = { -readonly [K in keyof T]: T[K] };
export type Complete<T> = { [K in keyof T]-?: T[K] };
```

And the two shapes the original hand-copied:

```ts
export type Getters<T> = { [K in keyof T]: () => T[K] };
export type FlagsOf<T> = { [K in keyof T]: boolean };
```

`Getters<Settings>` produces exactly the interface the original wrote by hand — but *derived*. Add `language: string` to `Settings` and `Getters<Settings>` instantly demands a `language: () => string` getter; any object missing it stops compiling. The tracker can't fall a field behind anymore, because it isn't a separate thing — it's a view of the same thing.

The hand-merge became a composition:

```ts
export type FrozenDraft = Readonly<Partial<Settings>>;
```

Read inside-out: make everything optional, then make everything readonly. Utility types are ordinary types, so they stack like function calls.

One connection worth noticing: exercise 23's `Schema<T> = { [K in keyof T]?: Rule<T[K]>[] }` was *already* a mapped type — a loop with a payload (`Rule<...>`) wrapped around each value. You've been using this machinery; now it has a name.

The type tests check the loops do their jobs: a raw `16` can't sit where `() => number` is required; `FlagsOf` demands *every* key; `MyPartial` still rejects typo'd keys (optional means "may be missing," never "may be misspelled"); and `FrozenDraft` refuses assignment.

## 7. Words you learned (glossary)

- **Mapped type** — `{ [K in keyof T]: ... }`: builds an object type by looping over another type's keys.
- **`keyof T`** — the union of `T`'s property names.
- **Indexed access `T[K]`** — the type of property `K` on `T`.
- **Modifier** — a property marker: `?` (optional) or `readonly` (not assignable).
- **`-?` / `-readonly`** — mapped-type syntax that *removes* a modifier from every property.
- **Generic constraint (`extends`)** — a rule limiting what a type parameter can be, e.g. `K extends keyof T`.
- **Composition** — stacking type formulas, like `Readonly<Partial<T>>`.
- **Standard library (stdlib)** — the types TypeScript ships built-in, like `Partial` and `Pick`.
- **Getter** — a function you call to read a value, e.g. `() => number`.
- **Hand-merge** — combining two transformations manually instead of composing the utilities that do them.
- **Shadow type** — a type meant to mirror another one (same keys, transformed values).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change, then undo it.

1. Add `language: string;` to `Settings` in `refactored/mapped.ts`. **Expected:** both `getters` and `touched` objects error until you add `language: () => '...'` and `language: false`. That's the self-maintenance the hand-copies lacked — compare with the original, where the same edit produces silence.
2. Write your own utility: `type Nullable<T> = { [K in keyof T]: T[K] | null };` and declare `const n: Nullable<Settings> = { theme: null, fontSize: null, notifications: null };`. **Expected:** compiles. Change one `null` to `undefined`. **Expected:** error — `undefined` is not in `T[K] | null`.
3. Rebuild `Omit` yourself: `type MyOmit<T, K extends keyof T> = MyPick<T, Exclude<keyof T, K>>;` (`Exclude<A, B>` removes `B`'s members from union `A`). Test with `const o: MyOmit<Settings, 'theme'> = { fontSize: 16, notifications: true };`. **Expected:** compiles; adding `theme` to the object errors.
4. In `MyPick`, change `K extends keyof T` to just `K`. **Expected:** error inside `MyPick` itself — without the constraint, `T[P]` isn't provably valid. Constraints are what make the lookup safe.
5. Try `type Flipped = Editable<Readonly<Settings>>;` then `declare const f: Flipped; f.fontSize = 20;` — wait, `f` is `declare`d so assignment type-checks only. **Expected:** compiles — `Editable` stripped the `readonly` that `Readonly` added. Swap the order (`Readonly<Editable<...>>`) and the assignment errors.
