# 📘 Learning Guide: Typed Storage

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Apps save data to survive restarts: browser `localStorage`, files, little key-value stores. You `save('settings', {...})` today and `load('settings')` next week. The catch: **the thing you load was not written by the code that's loading it.** It was written by an older version of your app, or by a different feature that happened to pick the same key. Storage is a message from the past — and the past ran different code.

The original wrapper types this as a shrug: keys are freehand strings, `load` returns `any`. Two classic corruptions walk right in: a *key collision* (two features fighting over `'settings'`) and *version drift* (v1 stored a number where v2 expects an object). The refactor builds a **registry**: every key is declared once with a **schema** for its shape, writes are type-checked against the key, and every read is validated before it's trusted.

## 2. Concepts you need first

### Key-value storage
A store where you put values under string names. Browser `localStorage` only stores *strings*, so objects get serialized:
- `JSON.stringify(value)` — object → string, at save time.
- `JSON.parse(raw)` — string → value, at load time. **Throws** on malformed input, and its result could be any shape at all.

This exercise fakes the store with a `Map<string, string>` so it runs anywhere.

### Why storage is a boundary
Exercise 13 taught: data crossing into your program from outside (network, user input) must be validated, because the compiler can't see it. Storage is that lesson **with a time dimension**: even data your own app wrote is untrusted, because it may have been written by version 1 while version 2 is reading, or by another feature entirely. The other party at this boundary is your own past self.

### `any` on the read path
`load(key): any` means "whatever comes back, don't check it." `any` doesn't just skip one check — it *launders*: assign it to a typed variable and the wrong shape now travels under a correct-looking type. (Exercise 01 calls this the epidemic.)

```ts
const launches: { count: number } = load('launchCount'); // any fits ANY annotation
launches.count; // compiler is confident; runtime says undefined
```

### Schemas (imported from exercise 34)
A **schema** is one definition that both validates at runtime and carries a type at compile time:

```ts
interface Schema<T> {
  name: string;
  check: (value: unknown) => value is T;  // a type guard
}
```

`objectSchema<Settings>('Settings', { theme: isString, fontSize: isNumber })` builds one from per-field checkers. Exercise 34's LEARN.md explains this fully — this exercise *imports* that code, which is the point: the schema layer pays rent across projects.

### A registry + `as const` + `keyof`
A **registry** is one object mapping every legal key to its schema:

```ts
const STORAGE_SCHEMAS = {
  settings: objectSchema<Settings>(...),
  launchStats: objectSchema<LaunchStats>(...),
} as const;

type StorageKey = keyof typeof STORAGE_SCHEMAS; // 'settings' | 'launchStats'
```

`as const` keeps everything exact; `keyof typeof` derives the union of legal keys from the object. Nobody hand-maintains the key list — it *is* the registry. (Exercise 33's LEARN.md walks through `as const`, `typeof`, and `keyof` from scratch.)

### Conditional types with `infer`
`infer` lets a conditional type *extract* a piece of another type. Here it opens the schema wrapper to get the shape inside:

```ts
type StoredShape<K extends StorageKey> =
  (typeof STORAGE_SCHEMAS)[K] extends Schema<infer T> ? T : never;
```

Read: "look up key K's schema in the registry; if it's a `Schema<`something`>`, name that something `T` and answer `T`." So `StoredShape<'settings'>` is `Settings`. One source of truth (the registry); everything derived. (Exercises 27/28 cover conditional types and `infer` in depth.)

### Key↔value correlation via generics
The generic signature `save<K extends StorageKey>(key: K, value: StoredShape<K>)` ties the second parameter's type to the *first argument's literal value*. Call `save('settings', ...)` and TypeScript infers `K = 'settings'`, so the value must be a `Settings`:

```ts
save('settings', { theme: 'dark', fontSize: 16 }); // ✅ OK
save('settings', { volume: 0.8 });                 // ❌ Error: wrong shape for THIS key
```

### Honest absence: `| null`
`load` returns `StoredShape<K> | null`. The `null` covers: key never written, corrupted JSON, or old-version data that fails validation. Because null is *in the type*, callers must handle it — `load('settings').fontSize` won't compile. (Exercise 05's territory.)

## 3. Walking through the original code

The wrapper:

```ts
export function save(key: string, value: unknown): void {
  memoryStore.set(key, JSON.stringify(value));
}

export function load(key: string): any {
  const raw = memoryStore.get(key);
  return raw === undefined ? null : JSON.parse(raw);
}
```

`key: string` — any spelling accepted, no master list. `load(): any` — whatever history left there, blessed unconditionally.

Corruption 1 — key collision:

```ts
save('settings', { theme: 'dark', fontSize: 16 });  // Feature A
save('settings', { volume: 0.8 });                   // Feature B, months later
```

Same key, different shapes, last write wins, silently. Then Feature A loads:

```ts
export const settings = load('settings');
export const size = settings.fontSize + 2;
```

`fontSize` is gone — `undefined + 2` is `NaN`. And NaN is a perfectly valid `number`, so it keeps flowing through arithmetic without ever crashing. The corruption travels.

Corruption 2 — version drift:

```ts
save('launchCount', 5);                                   // v1 stored a bare number
export const launches: { count: number } = load('launchCount'); // v2 expects an object
export const message = `launched ${launches.count} times`;
```

`load` returns the number `5`; `any` lets it wear the type `{ count: number }`; `launches.count` is `undefined`; the UI says "launched undefined times."

## 4. What's wrong with it (in beginner terms)

**Flaw 1: freehand keys.** Runtime story: Feature B's developer picks `'settings'` for volume settings, unaware Feature A used it for theme settings. No error at write time — a Map takes any key. Weeks later Feature A's users report text rendered at size NaN. The two writes are in different files, maybe different months; nothing ever connected them. A typo does the same damage: `load('setings')` returns null forever and nobody knows why.

**Flaw 2: unvalidated reads.** Runtime story: v1 shipped storing `launchCount` as a bare `5`. v2 refactors to `{ count: 5 }` — and every *existing* user still has v1's number on disk. On v2's first launch on an upgraded device: "launched undefined times." Your tests never caught it, because test devices had fresh storage. Only real users carry history.

**Flaw 3: `any` hides both.** Both bugs needed one accomplice: a read path that promises nothing and checks nothing. `any` said yes, so the wrong shapes traveled under correct-looking types until they surfaced as NaN and `undefined` far from the cause.

## 5. Try it yourself first!

1. **Vague hint:** what if the set of legal keys were a *type*, not a habit? Where would you write down which shape belongs to which key?
2. **Warmer:** build one object mapping each key to something describing its shape — exercise 34's `Schema` objects are sitting right there to import. Add `as const`, and derive `type StorageKey = keyof typeof ...`.
3. **Warmer still:** change `save`'s key parameter from `string` to a generic `K extends StorageKey`. Now: how do you say "the value must be *K's* shape"? You need a type that maps a key to its stored shape.
4. **Specific:** write `StoredShape<K>` using a conditional: `(typeof STORAGE_SCHEMAS)[K] extends Schema<infer T> ? T : never`. Use it as the value parameter's type and as `load`'s return (`| null`).
5. **Last piece:** in `load`, wrap `JSON.parse` in try/catch (corrupted entry → null), then run the key's schema check — data that fails validation is also null. Absent, not explosive.

## 6. Understanding the refactored solution

The registry declares every stored shape once:

```ts
const STORAGE_SCHEMAS = {
  settings: objectSchema<Settings>('Settings', { theme: isString, fontSize: isNumber }),
  launchStats: objectSchema<LaunchStats>('LaunchStats', { count: isNumber }),
} as const;

type StorageKey = keyof typeof STORAGE_SCHEMAS;
```

Note the import at the top of the file: the `Schema` machinery comes from `../../34-api-boundary/refactored/api.js`. Cross-project reuse — the schema layer built for the network boundary works unchanged for the storage boundary, because they're the same problem.

`StoredShape<K>` (the `infer` conditional from section 2) derives each key's payload type from the registry. Then the accessors correlate:

```ts
export function save<K extends StorageKey>(key: K, value: StoredShape<K>): void {
  memoryStore.set(key, JSON.stringify(value));
}
```

Feature B's `save('settings', { volume: 0.8 })` is now a compile error — the value doesn't match *that key's* shape. And `save('setings', ...)`? Not a `StorageKey`. Typos die at the keyboard.

The read side validates history:

```ts
export function load<K extends StorageKey>(key: K): StoredShape<K> | null {
  const raw = memoryStore.get(key);
  if (raw === undefined) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return null; // corrupted entry: absent, not explosive
  }
  return STORAGE_SCHEMAS[key].check(data) ? (data as StoredShape<K>) : null;
}
```

Three layers of honesty: missing key → null; unparseable JSON → null; parseable but *wrong-shaped* (v1's bare `5` against v2's object schema) → null. The demo shows the payoff: v1's `'5'` in the store yields `null`, and the caller renders "first launch (or old data)" instead of "launched undefined times."

(One footnote for careful readers: that final `data as StoredShape<K>` is a small contained cast. The schema *did* validate the data — but TypeScript can't connect "the check for key K passed" to "so the type is `StoredShape<K>`" across a generic lookup. The cast is adjacent to its guard, auditable in one glance — the "contained unsafety" pattern, same as exercise 41's.)

The README also points at the real-world upgrade path: when shapes must change, use versioned keys (`settings.v2`) plus a migration function — and the registry is exactly where those live.

## 7. Words you learned (glossary)

- **Key-value storage** — a store of values under string names (like `localStorage`).
- **Serialization** — turning a value into a string (`JSON.stringify`) to store it.
- **`JSON.parse`** — string → value; throws on bad input; result shape unknown.
- **Boundary** — where unverified data enters your typed program; storage is one.
- **Version drift** — old-version data read by new-version code.
- **Key collision** — two features writing different shapes under the same key.
- **Registry** — one object mapping every legal key to its schema; the single source of truth.
- **Schema** — one definition that validates at runtime and carries a type (see exercise 34's LEARN.md).
- **Type guard** — a `value is T` function whose true-return narrows the type.
- **`as const`** — keeps an object literal's types exact and read-only.
- **`keyof typeof`** — derive a union of keys from a value's type.
- **Conditional type** — `A extends B ? X : Y`, an if-statement for types.
- **`infer`** — inside a conditional type, captures part of a matched type (here: the `T` inside `Schema<T>`).
- **Correlation** — a generic tying one parameter's type to another's value (`save(key, value)`).
- **Honest absence** — returning `T | null` so callers must handle "not there."
- **Contained cast** — an `as` sitting immediately next to the runtime check that justifies it.
- **Migration** — code that upgrades old stored shapes to new ones (e.g., under `settings.v2`).

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change (then undo it).

1. **Register a new key.** In `refactored/storage.ts`, add `interface HighScore { points: number }` and a `highScore: objectSchema<HighScore>('HighScore', { points: isNumber })` entry in the registry. Expected: ✅ `save('highScore', { points: 100 })` compiles immediately — key union and shape both derived, no other edits needed.
2. **Replay Feature B's mistake.** Add `save('settings', { volume: 0.8 });`. Expected: ❌ error — the value must match the `settings` key's shape. This is the collision, caught at the keyboard.
3. **Typo a key.** Add `load('setting');`. Expected: ❌ `Argument of type '"setting"' is not assignable to parameter of type 'StorageKey'`. Freehand keys are gone.
4. **Skip the null check.** Add `const fs = load('settings').fontSize;`. Expected: ❌ "'load(...)' is possibly 'null'" — the compiler forces the absence check that makes old data safe.
5. **Inspect the derivation.** Add `type Probe = StoredShape<'launchStats'>;` and hover `Probe` in your editor. Expected: it shows `LaunchStats` — extracted from the registry by `infer`, not written by hand anywhere.
