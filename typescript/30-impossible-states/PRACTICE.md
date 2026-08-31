# 🏋️ Practice: Impossible States

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch `.ts` file inside the `typescript/` folder (end it with `export {}` so it's a module) or in a COPY of `refactored/player.ts`, then run `npm run typecheck`.

## Exercises

### ⭐ 1. An honest position reader (warm-up)

Write `positionOf(state: PlayerState): number | null` — the position where one exists (`'playing'`, `'paused'`), `null` everywhere else. Note the design point: the *field* is never nullable, but a *reader's return* may honestly be.

**Practices:** narrowing before reading a variant-specific field.
**Hint:** two `case` labels can share one body — `case 'playing': case 'paused':` — and inside it the state is narrowed to the union of just those two variants.
**Check:** must compile; the same `state.positionSeconds` read placed *before* the `switch` must error with roughly "Property 'positionSeconds' does not exist on type 'PlayerState'".

### ⭐⭐ 2. A download manager that can't lie (core)

Model a file download: queued (knows its `url`), downloading (`url`, `bytesReceived`, `totalBytes`), done (`url`, `savedPath`), canceled (`url`, `reason`). Design the union so byte counters exist *only* mid-download, then write `progressLabel(state): string` as a switch with no `default`.

**Practices:** the recipe — list states, place each field only where it means something.
**Hint:** `url` legitimately lives on every variant; that's fine — placement is per-field, not all-or-nothing.
**Check:** add two `@ts-expect-error` tests: a `'done'` state carrying `bytesReceived` (excess property) and a `'downloading'` state missing `totalBytes` (missing property). Both must be compile errors.

### ⭐⭐ 3. Un-bag the chat connection (core)

Here's a Big Bag: `{ isConnecting: boolean; isConnected: boolean; socketId: string | null; retryCount: number; lastError: string | null }`. Redesign it as a `ChatState` union with variants `'disconnected'`, `'connecting'` (with `attempt`), `'connected'` (with `socketId`), and `'failed'` (with `lastError` and `attempts`). Nothing may be nullable.

**Practices:** converting flag soup into variants; killing `| null` by moving fields.
**Hint:** `socketId: string | null` is the tell — it's `string` on exactly one variant and absent everywhere else.
**Check:** add `@ts-expect-error` tests replaying the bag's nonsense: a `'connected'` state that also carries `attempt`, and a `'connected'` state with no `socketId`. Both must fail to compile.

### ⭐⭐ 4. The retry transition (core)

For your `ChatState`: write `retry(state: ChatState): ChatState` that turns `'failed'` into `'connecting'` with `attempt` set to the failure's `attempts + 1`, and returns every other state unchanged.

**Practices:** transitions that narrow first, then build a whole new variant.
**Hint:** mirror `pause` in the refactored player — an early `return state` for the variants that can't retry, so the rest of the function is narrowed to `'failed'`.
**Check:** must compile. Then delete your early-return guard line: building the `'connecting'` object must now error with roughly "Property 'attempts' does not exist on type 'ChatState'". Restore the guard.

### ⭐⭐⭐ 5. `assertStatus` — a typed narrowing helper (challenge)

Write `type StateOf<S extends PlayerState['status']> = ...` that plucks one variant from `PlayerState` by its status, and `assertStatus(state, status)` that throws if the state isn't in that status and otherwise returns it *as the specific variant type*.

**Practices:** `Extract`, generics constrained to a discriminant, one contained cast.
**Hint:** `Extract<PlayerState, { status: S }>` keeps only union members assignable to `{ status: S }`. Inside the function the compiler can't connect the generic `S` to the runtime check, so the `return` needs one `as StateOf<S>`.
**Check:** `assertStatus(someState, 'playing').track` must compile as `string`; `assertStatus(someState, 'stopped').track` must error with roughly "Property 'track' does not exist".

### ⭐⭐⭐ 6. `RemoteData<T>` — the generic version (challenge)

The pattern generalizes to any fetched data. Define `RemoteData<T>` with variants `'idle'`, `'loading'`, `'success'` (with `data: T`), `'failure'` (with `error: string`). Then write `withDefault<T>(remote: RemoteData<T>, fallback: T): T` and `mapRemote<T, U>(remote: RemoteData<T>, fn: (data: T) => U): RemoteData<U>`.

**Practices:** generic discriminated unions — impossible states as a reusable library type.
**Hint:** in `mapRemote`'s non-success branch, just return `remote` — a state with no `data` is already a valid `RemoteData<U>`, whatever `U` is.
**Check:** with `declare const users: RemoteData<string[]>;` — `users.data` must error until narrowed; `mapRemote(users, (names) => names.length)` must compile and be assignable to `RemoteData<number>`.

## Solutions

### 1. An honest position reader

```ts
function positionOf(state: PlayerState): number | null {
  switch (state.status) {
    case 'playing':
    case 'paused':
      return state.positionSeconds;
    default:
      return null;
  }
}
```

**WHY:** the shared `case` body narrows `state` to `'playing' | 'paused'`, and since *both* variants carry `positionSeconds: number`, the read is legal on the narrowed union. The nullability lives in the return type — a per-call answer to "is there a position right now?" — instead of haunting the state shape itself.

### 2. A download manager that can't lie

```ts
type DownloadState =
  | { status: 'queued'; url: string }
  | { status: 'downloading'; url: string; bytesReceived: number; totalBytes: number }
  | { status: 'done'; url: string; savedPath: string }
  | { status: 'canceled'; url: string; reason: string };

function progressLabel(state: DownloadState): string {
  switch (state.status) {
    case 'queued': return `waiting: ${state.url}`;
    case 'downloading': {
      const pct = Math.round((state.bytesReceived / state.totalBytes) * 100);
      return `${pct}% of ${state.url}`;
    }
    case 'done': return `saved to ${state.savedPath}`;
    case 'canceled': return `canceled (${state.reason})`;
  }
}

// @ts-expect-error — byte counters don't exist once the download is done
const doneWithBytes: DownloadState = { status: 'done', url: 'a', savedPath: 'b', bytesReceived: 10 };
// @ts-expect-error — downloading requires totalBytes
const partial: DownloadState = { status: 'downloading', url: 'a', bytesReceived: 10 };
```

**WHY:** a finished download showing "43% complete" is now unrepresentable — the fields that could express it don't exist on `'done'` (excess property checks reject them at the literal). The switch needs no `default` because all four cases return; adding a fifth variant later makes this function — and every other consumer — stop compiling until handled.

### 3. Un-bag the chat connection

```ts
type ChatState =
  | { status: 'disconnected' }
  | { status: 'connecting'; attempt: number }
  | { status: 'connected'; socketId: string }
  | { status: 'failed'; lastError: string; attempts: number };

// @ts-expect-error — connected AND connecting can't coexist: one status field
const both: ChatState = { status: 'connected', socketId: 's1', attempt: 2 };
// @ts-expect-error — connected without a socketId is unrepresentable
const noSocket: ChatState = { status: 'connected' };
```

**WHY:** the two nullable fields dissolved: `socketId` is a plain `string` on exactly the variant that has a socket, `lastError` a plain `string` on exactly the failure variant. `retryCount` became two differently-named fields (`attempt`, `attempts`) on the two variants where counting means something — a stopped connection has no retry count to be stale.

### 4. The retry transition

```ts
function retry(state: ChatState): ChatState {
  if (state.status !== 'failed') return state;
  return { status: 'connecting', attempt: state.attempts + 1 };
}
```

**WHY:** after the early return, `state` is narrowed to the `'failed'` variant, which is what makes `state.attempts` readable at all — delete the guard and the build breaks, proving the narrowing does real work (that's the Check). The transition constructs a complete new variant rather than mutating flags, so there is no "forgot to clear `isConnecting`" bug to write.

### 5. `assertStatus` — a typed narrowing helper

```ts
type StateOf<S extends PlayerState['status']> = Extract<PlayerState, { status: S }>;

function assertStatus<S extends PlayerState['status']>(state: PlayerState, status: S): StateOf<S> {
  if (state.status !== status) {
    throw new Error(`expected ${status}, got ${state.status}`);
  }
  return state as StateOf<S>;
}

declare const someState: PlayerState;
const playing = assertStatus(someState, 'playing'); // { status: 'playing'; track: string; ... }
const t: string = playing.track;
// @ts-expect-error — a stopped player has no track
assertStatus(someState, 'stopped').track;
```

**WHY:** `Extract` filters a union by assignability, so `StateOf<'playing'>` is exactly the playing variant — callers get precise types per call site from one helper. The `as StateOf<S>` is a contained cast in the branded-constructor spirit: the compiler can't correlate the generic `S` with the runtime `!==` guard, but the guard sits directly above the cast, and the helper's *public* signature stays honest.

### 6. `RemoteData<T>` — the generic version

```ts
type RemoteData<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'failure'; error: string };

function withDefault<T>(remote: RemoteData<T>, fallback: T): T {
  return remote.status === 'success' ? remote.data : fallback;
}

function mapRemote<T, U>(remote: RemoteData<T>, fn: (data: T) => U): RemoteData<U> {
  return remote.status === 'success'
    ? { status: 'success', data: fn(remote.data) }
    : remote;
}

declare const users: RemoteData<string[]>;
const list: string[] = withDefault(users, []);
const counts: RemoteData<number> = mapRemote(users, (names) => names.length);
// @ts-expect-error — data is unreadable until narrowed to 'success'
users.data;
```

**WHY:** the union is generic in exactly one place — the field that carries payload — so the impossible-states guarantee ("no data unless success") holds for every `T` at once. In `mapRemote`'s non-success branch the unchanged `remote` typechecks as `RemoteData<U>` because those variants never mention `T`: the compiler verifies your intuition that idle/loading/failure states are payload-free. This is the player recipe promoted to a reusable library type.
