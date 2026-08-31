# 🏋️ Practice: The Unknown Boundary

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. Everything below is a new music-library domain, so write your own guards rather than importing from `refactored/savegame.js`.

## Exercises

### ⭐ 1. A number you actually checked (warm-up)

A play-count arrives from outside as `unknown`. Write `asFiniteNumber(value: unknown): number | null` returning the value when it really is a number and finite, and `null` otherwise. Then prove the boundary is doing work: declare `declare const mystery: unknown` and try to use it in arithmetic without a check.

**Practices:** narrowing `unknown` with `typeof` before any use, and returning `| null` instead of pretending.
**Hint:** `typeof value === 'number'` narrows; `Number.isFinite` then rules out `NaN` and `Infinity`, which are numbers as far as `typeof` is concerned.
**Check:** the function must compile with zero casts; `const doubled: number = mystery * 2;` must error with roughly `'mystery' is of type 'unknown'` — wrap it in a `@ts-expect-error` test.

### ⭐⭐ 2. The three-step boundary, applied (core)

Define `interface Track { title: string; seconds: number; artists: string[] }`. Build the boundary for it: a small `isRecord` guard, a small `isStringArray` guard, a composed `isTrack(value: unknown): value is Track`, and `parseTrack(json: string): Track | null` that parses inside `try`/`catch`, validates, and only then returns the typed value.

**Practices:** parse → validate → narrow, with the honest `| null` signature.
**Hint:** `isRecord(value) &&` must come first in `isTrack`, or the compiler won't let you write `value.title` at all.
**Check:** must compile cleanly with no `as Track` anywhere; `const careless: string = parseTrack('{}').title;` must error with roughly `'parseTrack(...)' is possibly 'null'`.

### ⭐⭐ 3. A guard for an optional field (core)

Listeners can attach a note to a track: `interface Note { trackTitle: string; comment?: string }`. Write `isNote`. The subtlety is that `comment` being absent must **pass** — an optional field is satisfied by `undefined` — while a `comment` of the wrong type must fail. Then write `renderNote(note: Note): string` that appends the comment only when there is one.

**Practices:** encoding "absent is fine, wrong is not" in a runtime check, and consuming an optional field safely afterwards.
**Hint:** `value.comment === undefined || typeof value.comment === 'string'` is the whole idea; note that `typeof undefined === 'string'` is false, so the `||` order matters.
**Check:** must compile cleanly; reading `someNote.comment.length` without a check must error with roughly `'someNote.comment' is possibly 'undefined'` — pin it with `@ts-expect-error`.

### ⭐⭐ 4. The other unknown: `catch` (core)

Under `strict`, a caught value is typed `unknown`, because JavaScript lets you `throw` anything — a string, an object, a number. Write `describeError(error: unknown): string` that returns `error.message` for a real `Error`, the value itself for a string, a `message` property for an error-shaped object, and `'unknown error'` otherwise. Then use it in `loadOrExplain(json: string): Track | string`.

**Practices:** treating the `catch` binding as the boundary it is; `instanceof` as a narrowing tool alongside `typeof`.
**Hint:** `error instanceof Error` narrows to `Error`; your `isRecord` from exercise 2 handles the "looks like an error but isn't one" case.
**Check:** `describeError` must compile cleanly; in a separate function, returning `error.message` straight out of a `catch` must error with roughly `'error' is of type 'unknown'` — wrap that line in `@ts-expect-error`.

### ⭐⭐⭐ 5. Guards all the way down (challenge)

A playlist nests: `interface Owner { name: string; verified: boolean }` and `interface Playlist { name: string; owner: Owner; tracks: Track[] }`. Write `isOwner`, then `isPlaylist` — which must validate the nested owner object *and* every element of `tracks`, not merely that `tracks` is an array. Finish with `loadPlaylist(json: string): Playlist | null`.

**Practices:** composing one guard per interface so a deep structure is validated to the leaves, exactly where a shallow guard would quietly lie.
**Hint:** `isOwner(value.owner) && Array.isArray(value.tracks) && value.tracks.every(isTrack)` — a guard function is exactly the callback `every` wants.
**Check:** must compile cleanly; `loadPlaylist` fed `'{"name":"Mix","owner":{"name":"Ada","verified":true},"tracks":[{"title":"T","seconds":"200","artists":[]}]}'` must return `null` at runtime, because `seconds` is a string.

### ⭐⭐⭐ 6. A guard as a filter (challenge)

Your app reads a newline-delimited log where each line *should* be a track. Write `parseTracks(lines: readonly string[]): Track[]` that parses each line, skips lines that throw, and returns only the valid tracks. The trick: `Array.prototype.filter` accepts a type predicate, so `unknown[].filter(isTrack)` produces a `Track[]` with no cast at all.

**Practices:** reusing one guard as a narrowing filter — the payoff for having written `value is Track` rather than returning a plain `boolean`.
**Hint:** collect into `const parsed: unknown[] = []` first, then `return parsed.filter(isTrack)`.
**Check:** `parseTracks([...]).map((track) => track.title)` must compile as `string[]`; assigning `rawRows.filter((row) => isRecord(row))` to a `Track[]` must error — pin it with `@ts-expect-error`.

## Solutions

### Solution 1

```ts
function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

declare const mystery: unknown;
// @ts-expect-error — `unknown` grants no arithmetic until you check
const doubled: number = mystery * 2;
```

WHY: `unknown` blocks every use, so the only way out is a check the compiler can follow — here `typeof`, which narrows to `number` for the rest of the function. `Number.isFinite` adds a rule the *type* cannot express: `NaN` is a `number`, and letting it through would poison every sum downstream. Returning `number | null` instead of throwing keeps the failure visible in the signature, which is exercise 05's lesson meeting exercise 13's boundary.

### Solution 2

```ts
interface Track {
  title: string;
  seconds: number;
  artists: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isTrack(value: unknown): value is Track {
  return (
    isRecord(value) &&
    typeof value.title === 'string' &&
    typeof value.seconds === 'number' &&
    Number.isFinite(value.seconds) &&
    isStringArray(value.artists)
  );
}

function parseTrack(json: string): Track | null {
  let data: unknown;
  try {
    data = JSON.parse(json) as unknown;
  } catch {
    return null;
  }
  return isTrack(data) ? data : null;
}

// @ts-expect-error — the result may be null; callers must handle it
const careless: string = parseTrack('{}').title;
```

WHY: the `&&` chain is ordered, not decorative — `isRecord(value)` is what makes `value.title` legal to write, and each following clause narrows one field. `JSON.parse(json) as unknown` is the file's only assertion and it *removes* capability (`any → unknown`), which is the one direction that cannot introduce a bug. The `Track` type on the return is earned by the checks rather than claimed by the annotation, so the compiler and the runtime finally agree.

### Solution 3

```ts
interface Note {
  trackTitle: string;
  comment?: string;
}

function isNote(value: unknown): value is Note {
  return (
    isRecord(value) &&
    typeof value.trackTitle === 'string' &&
    (value.comment === undefined || typeof value.comment === 'string')
  );
}

function renderNote(note: Note): string {
  return note.comment === undefined ? note.trackTitle : `${note.trackTitle}: ${note.comment}`;
}

declare const someNote: Note;
// @ts-expect-error — an optional field is possibly undefined until checked
const commentLength: number = someNote.comment.length;
```

WHY: `comment?: string` means the property may be missing *or* explicitly `undefined`, so a guard that demands `typeof value.comment === 'string'` would wrongly reject the common case of a note with no comment. The parenthesised `||` says "absent, or the right type" and rejects everything else — a number comment still fails. Downstream, `strictNullChecks` keeps the obligation alive: the compiler will not let `renderNote` touch `.length` until the `undefined` branch is handled.

### Solution 4

```ts
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return 'unknown error';
}

function loadOrExplain(json: string): Track | string {
  try {
    const data: unknown = JSON.parse(json);
    return isTrack(data) ? data : 'valid JSON, wrong shape';
  } catch (error) {
    return describeError(error);
  }
}

function unsafeCatch(json: string): string {
  try {
    JSON.parse(json);
    return 'ok';
  } catch (error) {
    // @ts-expect-error — under strict, a caught value is `unknown`
    return error.message;
  }
}
```

WHY: `catch (error)` is a boundary nobody thinks of as one, and strict mode types it `unknown` for a good reason — `throw 'oops'` is legal JavaScript, so `error.message` really can be `undefined`. Three narrowings cover the realistic cases in order of trustworthiness, and the final fallback means this function can never itself throw while reporting a throw. The `unsafeCatch` twin pins the old habit as a compile error, which is the whole difference between `unknown` and `any` here.

### Solution 5

```ts
interface Owner {
  name: string;
  verified: boolean;
}

interface Playlist {
  name: string;
  owner: Owner;
  tracks: Track[];
}

function isOwner(value: unknown): value is Owner {
  return isRecord(value) && typeof value.name === 'string' && typeof value.verified === 'boolean';
}

function isPlaylist(value: unknown): value is Playlist {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    isOwner(value.owner) &&
    Array.isArray(value.tracks) &&
    value.tracks.every(isTrack)
  );
}

function loadPlaylist(json: string): Playlist | null {
  let data: unknown;
  try {
    data = JSON.parse(json) as unknown;
  } catch {
    return null;
  }
  return isPlaylist(data) ? data : null;
}
```

WHY: a predicate is a promise the compiler cannot audit, so a guard that only checks `Array.isArray(value.tracks)` would hand you a `Playlist` whose tracks are anything at all — the original's `"nine"` bug, one level deeper and harder to spot. One guard per interface keeps each promise small enough to be obviously true, and they compose: `every(isTrack)` reuses exercise 2's work element by element. This hand-rolled shape is exactly what schema libraries generate for you at scale.

### Solution 6

```ts
function parseTracks(lines: readonly string[]): Track[] {
  const parsed: unknown[] = [];
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line) as unknown);
    } catch {
      // skip unparseable lines
    }
  }
  return parsed.filter(isTrack);
}

const titles: string[] = parseTracks(['{}']).map((track) => track.title);

declare const rawRows: unknown[];
// @ts-expect-error — a `Record<string, unknown>[]` is not a `Track[]`
const notNarrowed: Track[] = rawRows.filter((row) => isRecord(row));
```

WHY: `filter` has an overload typed `(predicate: (v: T) => v is S) => S[]`, so handing it a guard converts `unknown[]` into `Track[]` — the array-level version of the narrowing you already get from an `if`. That conversion is free and honest precisely because `isTrack` inspects every field; a callback that only proves "is an object" gives back `Record<string, unknown>[]`, which the compiler refuses to call a `Track[]`. Collecting into `unknown[]` first keeps the parse failures and the shape failures as two separate, individually handled problems.
