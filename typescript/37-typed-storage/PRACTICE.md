# 🏋️ Practice: Typed Storage

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file like `typescript/37-typed-storage/practice.ts` (end it with `export {}` so it's a module), import the schema helpers with `import { objectSchema, isNumber, isString } from '../34-api-boundary/refactored/api.js';`, and check with `npm run typecheck` from the repo. Copy the registry pieces you need (`STORAGE_SCHEMAS`, `StorageKey`, `StoredShape`, `save`, `load`) from `refactored/storage.ts` — don't modify the original.

## Exercises

### ⭐ 1. Typed removal (warm-up)

Write `remove(key)` and `isStored(key)` helpers for the store. Deleting under a typo'd key is just as silent a bug as loading under one, so both functions must accept only registered keys — no generics needed here.
Practices: deriving a key union with `keyof typeof` and using it as a parameter type.
Hint: the parameter type you want already exists in the file — it's `StorageKey`.
Check: `remove('settings')` compiles; `remove('cart')` must error with roughly `'"cart"' is not assignable to parameter of type 'StorageKey'`.

### ⭐⭐ 2. A registry for the music player (core)

Build a second, independent registry for a music-player feature: `Playlist { name: string; trackCount: number }` and `PlayerState { volume: number; muted: boolean }` under the keys `playlist` and `playerState`. Derive `PlayerKey` and `PlayerShape<K>` from it, then write correlated `savePlayer`/`loadPlayer` accessors (prefix real store keys with `player.` so the two registries can't collide). You'll need to write an `isBoolean` guard — exercise 34 doesn't ship one.
Practices: rebuilding the whole registry pattern (`as const` → `keyof typeof` → `infer`) from scratch on a new domain.
Hint: `PlayerShape<K>` is `(typeof PLAYER_SCHEMAS)[K] extends Schema<infer T> ? T : never` — the same conditional, pointed at your registry.
Check: `savePlayer('playerState', { volume: 0.8, muted: false })` compiles; `savePlayer('playlist', { volume: 0.8, muted: false })` must error (wrong shape for that key); `loadPlayer('playlist')` is `Playlist | null`, so `.trackCount` without a null check must error.

### ⭐⭐ 3. `loadOr` — the always-something read (core)

Write `loadOr(key, fallback)` that returns the stored shape when it's present and valid, and the fallback otherwise — so callers that have a sensible default never touch `null`. Both the fallback and the return type must be the shape belonging to *that key*.
Practices: threading one generic `K` through two parameters and the return type.
Hint: signature `loadOr<K extends StorageKey>(key: K, fallback: StoredShape<K>): StoredShape<K>` — the body is three lines on top of `load`.
Check: `loadOr('settings', { theme: 'light', fontSize: 14 }).fontSize + 2` compiles with no null check; `loadOr('settings', { count: 0 })` must error — the fallback is checked against the key's shape too.

### ⭐⭐ 4. `update` — read-modify-write (core)

Write `update(key, fn)` where `fn` receives what's currently stored (`StoredShape<K> | null` — the past may hold nothing) and must return a complete new value, which gets saved. Use it to increment `launchStats.count`, treating `null` as a first launch.
Practices: a correlated callback — the function parameter's own parameter and return type both derive from `K`.
Hint: the type of `fn` is `(current: StoredShape<K> | null) => StoredShape<K>`; the body is one line composing `save`, `fn`, and `load`.
Check: in `update('launchStats', (current) => ...)`, `current.count` must error until you narrow `null` away; `update('launchStats', () => ({}))` must error with roughly `'count' is missing`.

### ⭐⭐⭐ 5. The v2 migration (challenge)

Settings are growing a `compact: boolean` field. Following the README's versioned-key advice: add `SettingsV2` and a `'settings.v2'` registry entry (quoted key — it contains a dot), then write `migrateSettings(): SettingsV2 | null` that returns v2 data if present, otherwise loads old `'settings'` data, upgrades it with `compact: false`, saves it under the new key, and returns it. Return `null` only when *neither* key holds valid data.
Practices: evolving a registry without breaking old keys; migration as a typed function.
Hint: spread the v1 value and add the new field: `{ ...v1, compact: false }`.
Check: everything compiles; `save('settings.v2', { theme: 'dark', fontSize: 16 })` must error with roughly `'compact' is missing` — the new key demands the new shape.

### ⭐⭐⭐ 6. `saveAll` — one batch, all keys checked (challenge)

Write `saveAll(entries)` that writes several keys in one call: `saveAll({ settings: {...}, launchStats: {...} })`. Its parameter type must pair every key with *its own* shape while letting callers omit any of them.
Practices: a mapped type over the key union, wrapped in `Partial`.
Hint: the parameter type is `Partial<{ [K in StorageKey]: StoredShape<K> }>`; inside, iterate `Object.keys(entries) as StorageKey[]` and skip `undefined` values.
Check: the mixed call above compiles; `saveAll({ settings: { count: 5 } })` must error — a wrong shape under a known key is still caught. Add a `@ts-expect-error` type test over that call to pin it.

## Solutions

### 1. Typed removal

```ts
function remove(key: StorageKey): void {
  memoryStore.delete(key);
}
function isStored(key: StorageKey): boolean {
  return memoryStore.has(key);
}
```

WHY: no generics are needed because nothing in the signature *depends* on which key it is — the return types are fixed. The whole job is done by the parameter type `StorageKey`, the union derived from the registry: unregistered and typo'd keys already fail to compile. Generics earn their place only when one type must be computed from another, as in `save`/`load`.

### 2. A registry for the music player

```ts
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

interface Playlist { name: string; trackCount: number }
interface PlayerState { volume: number; muted: boolean }

const PLAYER_SCHEMAS = {
  playlist: objectSchema<Playlist>('Playlist', { name: isString, trackCount: isNumber }),
  playerState: objectSchema<PlayerState>('PlayerState', { volume: isNumber, muted: isBoolean }),
} as const;

type PlayerKey = keyof typeof PLAYER_SCHEMAS;
type PlayerShape<K extends PlayerKey> =
  (typeof PLAYER_SCHEMAS)[K] extends Schema<infer T> ? T : never;

function savePlayer<K extends PlayerKey>(key: K, value: PlayerShape<K>): void {
  memoryStore.set(`player.${key}`, JSON.stringify(value));
}
function loadPlayer<K extends PlayerKey>(key: K): PlayerShape<K> | null {
  const raw = memoryStore.get(`player.${key}`);
  if (raw === undefined) return null;
  let data: unknown;
  try { data = JSON.parse(raw) as unknown; } catch { return null; }
  return PLAYER_SCHEMAS[key].check(data) ? (data as PlayerShape<K>) : null;
}
```

WHY: the pattern is domain-agnostic — registry (`as const`), derived key union (`keyof typeof`), derived shapes (`infer`), correlated accessors. Nothing about it was specific to settings. The `player.` prefix keeps the two registries collision-free in the shared store, and the one contained cast sits right next to the schema check that justifies it, exactly like the original's.

### 3. `loadOr`

```ts
function loadOr<K extends StorageKey>(key: K, fallback: StoredShape<K>): StoredShape<K> {
  const loaded = load(key);
  return loaded === null ? fallback : loaded;
}
```

WHY: `load`'s `| null` is honest but noisy for callers who always have a default. `loadOr` absorbs the null check once, and because `fallback` is typed `StoredShape<K>`, you can't accidentally provide a default of the wrong key's shape — the mistake that would quietly reintroduce version drift from the code side.

### 4. `update`

```ts
function update<K extends StorageKey>(
  key: K,
  fn: (current: StoredShape<K> | null) => StoredShape<K>,
): void {
  save(key, fn(load(key)));
}

update('launchStats', (current) => ({ count: current === null ? 1 : current.count + 1 }));
```

WHY: read-modify-write is where hand-rolled storage code usually drops validation ("I just wrote it, it's fine"). Routing it through `load` and `save` keeps both boundaries checked, and correlating the callback's types to `K` means the updater is fully typed with zero annotations at the call site — `current` arrives as `LaunchStats | null` automatically.

### 5. The v2 migration

```ts
interface SettingsV2 { theme: string; fontSize: number; compact: boolean }

// added inside STORAGE_SCHEMAS:
//   'settings.v2': objectSchema<SettingsV2>('SettingsV2', {
//     theme: isString, fontSize: isNumber, compact: isBoolean,
//   }),

function migrateSettings(): SettingsV2 | null {
  const v2 = load('settings.v2');
  if (v2 !== null) return v2;
  const v1 = load('settings');
  if (v1 === null) return null;
  const upgraded: SettingsV2 = { ...v1, compact: false };
  save('settings.v2', upgraded);
  return upgraded;
}
```

WHY: versioning by *key* means old and new shapes never fight over one entry — v1 data stays readable by the v1 schema for exactly as long as the migration needs it. The registry entry makes the new shape enforceable immediately (`save('settings.v2', v1shape)` won't compile), and the migration itself is ordinary guarded code: every read validated, every absence explicit.

### 6. `saveAll`

```ts
function saveAll(entries: Partial<{ [K in StorageKey]: StoredShape<K> }>): void {
  for (const key of Object.keys(entries) as StorageKey[]) {
    const value = entries[key];
    if (value !== undefined) save(key, value);
  }
}

saveAll({ settings: { theme: 'dark', fontSize: 16 }, launchStats: { count: 3 } });
// @ts-expect-error — a wrong shape under a known key is still caught
saveAll({ settings: { count: 5 } });
```

WHY: the mapped type `{ [K in StorageKey]: StoredShape<K> }` pairs each key with its own shape, and `Partial` makes every entry optional — so the *call site* is fully checked per key. Inside the loop the pairing loosens: `key` is the whole union, so `save(key, value)` checks against the union of shapes rather than the exact pair. That's a known limit of iterating correlated unions; the load-side schema validation remains the runtime backstop, which is why this design validates reads rather than trusting writes.
