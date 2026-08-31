# 🏋️ Practice: Overloads & Computed Returns

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file (e.g. `typescript/22-overloads/practice.ts`, ending with `export {}`) or in a COPY of `refactored/overloads.ts`, then run `npm run typecheck` from the `typescript/` folder.

## Exercises

### ⭐ 1. `pickRandom` — a fallback kills the `undefined` (warm-up)

Write `pickRandom` with two overloads: `pickRandom(items)` returns `T | undefined` (the array might be empty), while `pickRandom(items, fallback)` returns plain `T`. Implement it once underneath (pick `items[Math.floor(Math.random() * items.length)]`, falling back with `??`). This is `getConfig`'s two-truths shape, now with a generic in play.

Practices: stacking overloads over one implementation, with a generic `T` flowing through.

Hint: both overloads and the implementation all start `<T>`; the implementation takes `fallback?: T` and returns `T | undefined`.

Check: `pickRandom(['a','b'], 'a').toUpperCase()` must compile; add a `@ts-expect-error` type test proving `pickRandom(['a','b']).toUpperCase()` fails with roughly "possibly undefined".

### ⭐⭐ 2. `createLogger` — overloads for unlike-shaped arguments (core)

`getConfig`'s overloads differed by argument *count*; write a pair that differ by argument *shape*: `createLogger(name: string)` and `createLogger(options: { name: string; level: 'debug' | 'info' | 'warn' })`, both returning a `Logger` (`{ name; level }`, defaulting level to `'info'` in the string case). The implementation signature takes the union and narrows with `typeof`.

Practices: overloads whose cases are structurally different, plus narrowing inside the private implementation.

Hint: the implementation is `createLogger(arg: string | LoggerOptions): Logger` — callers never see it.

Check: both call shapes must compile; `createLogger(42)` must error with roughly "no overload matches this call".

### ⭐⭐ 3. An event table that computes PARAMETER types (core)

`makeElement` used a table to compute the *return* type; use one to compute a *parameter*. Define `type AppEvents = { login: { user: string }; logout: { reason: string }; purchase: { sku: string; cents: number } }`, then declare (no body needed — `declare function`) `emit(event, payload)` and `on(event, handler)` so the payload/handler type is looked up from the event name.

Practices: `K extends keyof Map` + `Map[K]` in parameter position — the other direction of the lookup trick.

Hint: `emit<E extends keyof AppEvents>(event: E, payload: AppEvents[E]): void`; the handler is `(payload: AppEvents[E]) => void`.

Check: `emit('purchase', { sku: 'book', cents: 900 })` must compile and the callback in `on('login', (p) => ...)` must know `p.user`. Add `@ts-expect-error` tests for a wrong payload, an unknown event name, and reading `p.cents` inside a `'login'` handler.

### ⭐⭐ 4. `readAsset` — a literal option selects the overload (core)

Write `readAsset(path: string): string` and `readAsset(path: string, options: { binary: true }): Uint8Array` over one implementation returning `string | Uint8Array`. The interesting part: the second overload's option is the *literal type* `true`, not `boolean` — so only exactly `{ binary: true }` selects the bytes version.

Practices: literal types inside overload signatures; an options object steering the return type.

Hint: the implementation takes `options?: { binary: true }` and branches on `options?.binary`.

Check: `readAsset('notes.txt').toUpperCase()` must compile; `readAsset('logo.png', { binary: true })[0]` must be a `number`; `readAsset('logo.png', { binary: false })` must error with roughly "no overload matches".

### ⭐⭐⭐ 5. `load` — both tools in one signature (challenge)

Combine the lesson's two tools. Given `type StoreMap = { user: { id: number; name: string }; theme: 'light' | 'dark'; volume: number }`, write `load` so that `load(key)` returns `StoreMap[K] | undefined` and `load(key, fallback)` returns `StoreMap[K]` — the table computes *what* comes back, the overloads decide *whether* `undefined` is possible. Implement once over a `Partial<StoreMap>` store.

Practices: generic overloads — a lookup-typed return that still varies by call shape.

Hint: both overloads start `<K extends keyof StoreMap>`; the fallback parameter is typed `StoreMap[K]`.

Check: `const t: 'light' | 'dark' = load('theme', 'light')` must compile. Add `@ts-expect-error` tests for: assigning `load('volume')` to a plain `number`, calling `load('brightness')`, and calling `load('volume', 'loud')`.

## Solutions

### 1. `pickRandom`

```ts
function pickRandom<T>(items: T[]): T | undefined;
function pickRandom<T>(items: T[], fallback: T): T;
function pickRandom<T>(items: T[], fallback?: T): T | undefined {
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? fallback;
}
const safe = pickRandom(['rock', 'paper'], 'rock');
const upper: string = safe.toUpperCase(); // ✅
// @ts-expect-error — no fallback: the result may be undefined
pickRandom(['rock', 'paper']).toUpperCase();
```

WHY: each overload states one exact truth, and `T` is captured per call, so `pickRandom(['a'], 'a')` returns `string`, not some vague union. The implementation signature (`fallback?: T`, return `T | undefined`) is loose enough to cover both overloads but invisible to callers — exactly the public-precision/private-plumbing split from the README.

### 2. `createLogger`

```ts
type Level = 'debug' | 'info' | 'warn';
interface LoggerOptions { name: string; level: Level }
interface Logger { name: string; level: Level }

function createLogger(name: string): Logger;
function createLogger(options: LoggerOptions): Logger;
function createLogger(arg: string | LoggerOptions): Logger {
  if (typeof arg === 'string') return { name: arg, level: 'info' };
  return { name: arg.name, level: arg.level };
}
// @ts-expect-error — no overload takes a number
createLogger(42);
```

WHY: when the cases are few and structurally *unlike* (a bare string vs. an options object), overloads document each accepted shape by name. Inside the body the union parameter needs one `typeof` narrowing — the same check the compiler would force anyway — and anything outside the published list, like `42`, fails overload resolution instead of sneaking into the implementation.

### 3. Event table

```ts
type AppEvents = {
  login: { user: string };
  logout: { reason: string };
  purchase: { sku: string; cents: number };
};
declare function emit<E extends keyof AppEvents>(event: E, payload: AppEvents[E]): void;
declare function on<E extends keyof AppEvents>(
  event: E,
  handler: (payload: AppEvents[E]) => void,
): void;

emit('purchase', { sku: 'book', cents: 900 }); // ✅
on('login', (payload) => payload.user.toUpperCase()); // ✅ payload inferred
// @ts-expect-error — payload must match the event's row (cents missing)
emit('purchase', { sku: 'book' });
// @ts-expect-error — unknown event names are rejected
emit('signup', { user: 'ada' });
// @ts-expect-error — a login payload has no .cents
on('login', (payload) => payload.cents);
```

WHY: `E` captures the event name as a literal, and `AppEvents[E]` looks up that event's payload — the same `K`/`Map[K]` machinery as `makeElement`, but computing what the caller must *pass in* rather than what they get back. One signature covers N events, and both wrong payloads and unknown events die at the call site.

### 4. `readAsset`

```ts
function readAsset(path: string): string;
function readAsset(path: string, options: { binary: true }): Uint8Array;
function readAsset(path: string, options?: { binary: true }): string | Uint8Array {
  return options?.binary ? new Uint8Array(8) : `contents of ${path}`;
}
const shouted: string = readAsset('notes.txt').toUpperCase(); // ✅
const firstByte: number = readAsset('logo.png', { binary: true })[0]; // ✅
// @ts-expect-error — only { binary: true } exists in the overload list
readAsset('logo.png', { binary: false });
```

WHY: typing the option as the literal `true` (not `boolean`) means the overload only matches when the caller *committed* to binary mode, so the return type can be exact. `{ binary: false }` matches neither overload and is rejected outright — which is honest: the string version simply takes no options. The implementation returns the union, but callers never see it.

### 5. `load`

```ts
type StoreMap = {
  user: { id: number; name: string };
  theme: 'light' | 'dark';
  volume: number;
};
function load<K extends keyof StoreMap>(key: K): StoreMap[K] | undefined;
function load<K extends keyof StoreMap>(key: K, fallback: StoreMap[K]): StoreMap[K];
function load<K extends keyof StoreMap>(key: K, fallback?: StoreMap[K]): StoreMap[K] | undefined {
  const store: Partial<StoreMap> = { theme: 'dark' };
  return store[key] ?? fallback;
}
const themeOk: 'light' | 'dark' = load('theme', 'light'); // ✅
// @ts-expect-error — no fallback: number | undefined is not number
const volumeBad: number = load('volume');
// @ts-expect-error — unknown keys are rejected by the table
load('brightness');
// @ts-expect-error — the fallback must match the key's value type
load('volume', 'loud');
```

WHY: the two tools solve two *different* vaguenesses at once — the table (`StoreMap[K]`) computes which type comes back per key, and the overload pair decides whether `| undefined` belongs in it. Note the fallback is typed `StoreMap[K]`, so it's correlated with the key: a string fallback for `'volume'` is a compile error, not a runtime surprise. The `Partial<StoreMap>` store keeps the implementation honest about misses.
