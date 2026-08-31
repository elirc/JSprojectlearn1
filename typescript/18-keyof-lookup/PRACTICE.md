# 🏋️ Practice: keyof & Indexed Access

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) and run `npm run typecheck` from the `typescript/` folder. Everything below is self-contained — no imports needed.

## Exercises

### ⭐ 1. Name the keys, name the values (warm-up)

A music app has `interface Track { title: string; durationSec: number; explicit: boolean }`. Write three type aliases: `TrackField` for the union of its key names, `TrackTitle` for the type stored at `title`, and `TrackDuration` for the type stored at `durationSec`. Then declare one `const` of each, holding a plausible value.

**Practices:** the two operators on their own — `keyof T` for names, `T['k']` for the value at a name.
**Hint:** neither operator needs a function or a generic; they're type expressions you can alias directly.
**Check:** the three `const`s must compile; `const wrongField: TrackField = 'duration'` must error with roughly `Type '"duration"' is not assignable to type 'keyof Track'`.

### ⭐⭐ 2. Keys of a value, not an interface (core)

Shipping rates live in a plain object, not an interface: `const SHIPPING_RATES = { standard: 4.99, express: 12.5, overnight: 24 }`. You want a `ShippingSpeed` type that always matches whatever is in that object, with no hand-maintained union. Use `typeof SHIPPING_RATES` to get the object's *type*, then `keyof` that. Write `rateFor(speed: ShippingSpeed): number` reading from the table.

**Practices:** `keyof typeof` — deriving a key union from a runtime value so the type can never drift from the data.
**Hint:** `typeof x` in *type* position means "the type the compiler inferred for the value `x`"; `keyof typeof x` then pulls its key names out.
**Check:** `rateFor('express')` must compile; `rateFor('overnite')` must error with roughly `not assignable to parameter of type 'ShippingSpeed'`. Add a fourth rate to the object and confirm it becomes callable with zero other edits.

### ⭐⭐ 3. An immutable setter (core)

Write `updated<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): T` — it returns a *copy* of `obj` with one field replaced, leaving the original untouched. This is the write half of the correlation, but generic over any object rather than hard-wired to `Profile`.

**Practices:** the correlated write signature (`key: K`, `value: T[K]`) plus a body the constraint makes legal.
**Hint:** `{ ...obj }` on a generic `T extends object` is still a `T`, so you can assign into the copy by key and return it — no cast required.
**Check:** `updated(track, 'durationSec', 400)` must compile and be typed `Track`; add `@ts-expect-error` tests catching `updated(track, 'durationSec', '6:40')` and `updated(track, 'duration', 400)`.

### ⭐⭐ 4. A key that arrives at runtime (core)

A URL carries `?sort=durationSec`, so the sort field reaches you as a plain `string` — and `string` is not assignable to `keyof Track`. Write a type guard `isTrackField(value: string): value is keyof Track`, backed by an array of the real field names, then `sortFieldFromQuery(raw: string | null): keyof Track` that returns the validated field or falls back to `'title'`.

**Practices:** bridging runtime strings into a `keyof` union — the guard is what turns "some string" into "one of these three names".
**Hint:** type the array as `readonly (keyof Track)[]` and check membership with `.some((field) => field === value)`; `.includes(value)` will fight you, because `value` is a wider type than the array's elements.
**Check:** `sortFieldFromQuery('durationSec')` must compile; assigning a bare `string` variable straight to a `keyof Track` (no guard) must error with roughly `Type 'string' is not assignable to type 'keyof Track'`.

### ⭐⭐⭐ 5. Correlation inside one object (challenge)

Exercise 3 kept the key and the value in two separate parameters. Real code often bundles them: an editor sends `{ field: 'durationSec', value: 400 }` as a single edit object. Write a *generic type alias* `TrackEdit<K extends keyof Track> = { field: K; value: Track[K] }`, then `applyEdit<K extends keyof Track>(track: Track, edit: TrackEdit<K>): Track` that reuses `updated`. The compiler must still pair each `field` with only its own `value` type.

**Practices:** carrying the correlation in a type alias, and letting `K` be inferred from a property *inside* an argument rather than from the argument itself.
**Hint:** type aliases take type parameters and can be constrained exactly like functions can — `type Foo<K extends keyof T> = ...`.
**Check:** `applyEdit(track, { field: 'explicit', value: true })` must compile; add `@ts-expect-error` tests catching `{ field: 'durationSec', value: '5:37' }` (right key, wrong value type) and `{ field: 'duration', value: 400 }` (no such key).

### ⭐⭐⭐ 6. `Object.keys` and the gap it leaves (challenge)

Write `changedFields<T extends object>(before: T, after: T): (keyof T)[]`, returning the names of the fields that differ. You'll hit the famous snag: `Object.keys` is typed `string[]`, not `(keyof T)[]`, so you need one deliberate assertion — and you should be able to say *why* the standard library is right to be cautious there.

**Practices:** producing `keyof T` as a *value*, and recognising the one place this idiom legitimately needs `as`.
**Hint:** `const keys = Object.keys(before) as (keyof T)[];` then `filter` with `before[key] !== after[key]` — indexed reads on both objects are legal because `key` is a real key of `T`.
**Check:** `changedFields(beforeEdit, afterEdit)` must be typed `(keyof Track)[]`; `const n: number = diff[0]` must error with roughly `Type '"title" | "durationSec" | "explicit"' is not assignable to type 'number'`.

## Solutions

### Solution 1

```ts
interface Track {
  title: string;
  durationSec: number;
  explicit: boolean;
}

type TrackField = keyof Track;              // 'title' | 'durationSec' | 'explicit'
type TrackTitle = Track['title'];           // string
type TrackDuration = Track['durationSec'];  // number

const sortField: TrackField = 'durationSec';
const heading: TrackTitle = 'Blue in Green';
const seconds: TrackDuration = 337;

// @ts-expect-error — 'duration' is not a key of Track
const wrongField: TrackField = 'duration';
```

WHY: these are the raw materials, used separately before they're combined. `keyof Track` is a union of *names*; `Track['title']` is the type of one *value*. Neither costs anything at runtime — both are compile-time lookups into a type you already wrote. Note that `TrackField` updates itself the moment you add a field to `Track`, which is the whole reason to derive it rather than hand-write `'title' | 'durationSec' | 'explicit'`.

### Solution 2

```ts
const SHIPPING_RATES = {
  standard: 4.99,
  express: 12.5,
  overnight: 24,
};

type ShippingSpeed = keyof typeof SHIPPING_RATES; // 'standard' | 'express' | 'overnight'

function rateFor(speed: ShippingSpeed): number {
  return SHIPPING_RATES[speed];
}

rateFor('express');
// @ts-expect-error — 'overnite' is not a key of the rate table
rateFor('overnite');
```

WHY: `keyof` needs a *type*, and `SHIPPING_RATES` is a *value*, so `typeof` bridges the two worlds — it hands `keyof` the type the compiler already inferred for the object. The payoff is that the data is the single source of truth: add `sameDay: 39` and `rateFor('sameDay')` works immediately, with no union to remember to update. The body compiles with no cast because `speed` is provably one of the table's own keys.

### Solution 3

```ts
function updated<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  const copy = { ...obj };
  copy[key] = value;
  return copy;
}

const track: Track = { title: 'Blue in Green', durationSec: 337, explicit: false };
const longer = updated(track, 'durationSec', 400); // Track

// @ts-expect-error — durationSec holds a number, not a string
updated(track, 'durationSec', '6:40');
// @ts-expect-error — 'duration' is not a key of Track
updated(track, 'duration', 400);
```

WHY: this is the refactor's `setSetting` with the object type lifted into a second parameter, so one function serves every shape instead of just `Profile`. `T extends object` earns two things at once: it lets `{ ...obj }` keep the type `T`, and it lets `K extends keyof T` mean something. Because `value` is typed `T[K]` and `copy[key]` expects exactly `T[K]`, the assignment needs no assertion — the constraint is the permission, as exercise 17 put it.

### Solution 4

```ts
const TRACK_FIELDS: readonly (keyof Track)[] = ['title', 'durationSec', 'explicit'];

function isTrackField(value: string): value is keyof Track {
  return TRACK_FIELDS.some((field) => field === value);
}

function sortFieldFromQuery(raw: string | null): keyof Track {
  if (raw !== null && isTrackField(raw)) return raw;
  return 'title';
}

declare const rawParam: string;
// @ts-expect-error — a plain string is not a key until the guard proves it
const unproven: keyof Track = rawParam;
```

WHY: `keyof` is a compile-time union, but query strings arrive at runtime, and the compiler cannot know that `'durationSec'` typed as `string` happens to be one of the three. The guard supplies that proof: after `isTrackField(raw)`, `raw` narrows from `string` to `keyof Track` and can be returned. `TRACK_FIELDS` is the one thing here that must be maintained by hand, and its `readonly (keyof Track)[]` annotation is what catches you if you misspell an entry or forget one after editing `Track`.

### Solution 5

```ts
type TrackEdit<K extends keyof Track> = { field: K; value: Track[K] };

function applyEdit<K extends keyof Track>(t: Track, edit: TrackEdit<K>): Track {
  return updated(t, edit.field, edit.value);
}

applyEdit(track, { field: 'explicit', value: true });
applyEdit(track, { field: 'title', value: 'So What' });

// @ts-expect-error — durationSec's value must be a number
applyEdit(track, { field: 'durationSec', value: '5:37' });
// @ts-expect-error — 'duration' is not a key of Track
applyEdit(track, { field: 'duration', value: 400 });
```

WHY: inference reaches *into* the argument — the compiler matches `{ field: 'explicit', ... }` against `{ field: K }`, fixes `K` as `'explicit'`, and then checks `value` against `Track['explicit']`. Bundling the pair into one object is exactly the shape a redux-style action takes, which is why exercise 32 feels familiar when you reach it. Note `applyEdit` hands its own `K` straight through to `updated` — correlations compose, because `K` stays a single literal type the whole way down.

### Solution 6

```ts
function changedFields<T extends object>(before: T, after: T): (keyof T)[] {
  const keys = Object.keys(before) as (keyof T)[];
  return keys.filter((key) => before[key] !== after[key]);
}

const beforeEdit: Track = { title: 'Blue in Green', durationSec: 337, explicit: false };
const afterEdit: Track = { title: 'Blue in Green', durationSec: 340, explicit: false };
const diff = changedFields(beforeEdit, afterEdit); // (keyof Track)[] — ['durationSec']

// @ts-expect-error — the result holds key NAMES, not the values behind them
const firstIsNumber: number = diff[0];
```

WHY: the assertion is unavoidable and, unusually, defensible. `Object.keys` returns `string[]` because TypeScript's object types are *structural* — a value typed `Track` may carry extra properties at runtime, so the real key list can be a superset of `keyof Track`. You are asserting a fact about your own data, not overruling a check. Everything after the assertion is fully typed: `before[key]` and `after[key]` are both `T[K]` for the same key, so the comparison is honest, and the result is a list of names you can feed straight back into exercise 3's `updated`.
