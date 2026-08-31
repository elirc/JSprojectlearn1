# 🏋️ Practice: Callback Types

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}`) — `npm run typecheck` from the `typescript/` folder picks it up. `declare function` is enough for most of these; you only need real bodies where a solution shows one.

## Exercises

### ⭐ 1. Name the progress callback (warm-up)

An upload helper reports progress by calling you back with the bytes sent so far and the total. Write `type ProgressHandler = ...` for that callback and `declare function uploadFile(path: string, onProgress: ProgressHandler): void`. Then try passing a handler that only takes `sent` and ignores `total` — decide what you *expect* before you typecheck.

**Practices:** turning "what does this callback get?" into a named type alias instead of a comment.
**Hint:** two `number` parameters and `void` back — a progress reporter's return value is nobody's business.
**Check:** `uploadFile('poster.png', (sent) => console.log(sent))` must compile (a callback may ignore trailing parameters), while a `@ts-expect-error` must catch `(sent: string) => console.log(sent)`.

### ⭐⭐ 2. A comment that lies, retired (core)

Here is the untyped original: `// "calls onSaved with the note, or onFailed with the reason"` above `function saveNote(text: string, onSaved: (note: any) => any, onFailed?: Function): void`. In truth the failure path is called with `{ kind: 'quota' | 'network', retryAfterMs: 1500 }`. Write `interface Note { id: number; text: string }`, a `SaveFailure` type, named `NoteSaved` and `NoteFailed` callback types, and a `declare function saveNote` where failure handling is **required**.

**Practices:** moving a contract out of prose and into signatures, and making the failure path non-optional.
**Hint:** drop the `?`. An unhandled failure should be something a caller has to type out, not something they get by forgetting.
**Check:** a correct two-callback call must compile; add `@ts-expect-error` tests catching `const believesTheComment: NoteFailed = (reason: string) => console.log(reason)` and a `saveNote` call that omits `onFailed` entirely.

### ⭐⭐ 3. One callback, one result (core)

Two parallel callbacks can never say "exactly one of these happens." Redesign exercise 2 as a single `done` callback taking `SaveResult`, a discriminated union with a `'saved'` branch carrying the note and a `'failed'` branch carrying `kind` and `retryAfterMs`. Write `declare function saveNoteOnce(text: string, done: (result: SaveResult) => void): void` and a caller that handles both arms.

**Practices:** replacing parallel callbacks with one discriminated result, then narrowing at the call site.
**Hint:** check `result.status === 'failed'` and `return` early; after that the compiler knows only the saved branch remains.
**Check:** the narrowing caller must compile; inside a second caller, `console.log(result.note)` with no check must error with roughly `Property 'note' does not exist on type 'SaveResult'`. Prove it with a `@ts-expect-error`.

### ⭐⭐ 4. A callback that answers back (core)

Not every callback returns `void`. A retry policy is asked "attempt 3 just failed — what now?" and answers with a delay in milliseconds or the word `'give-up'`. Write `RetryDecision` and `RetryPolicy` (taking the attempt number and a `SaveFailure`), then a `backoff` policy that gives up on quota failures and backs off linearly otherwise.

**Practices:** callbacks whose *return* type is part of the contract, with a union in return position.
**Hint:** `type RetryDecision = number | 'give-up'` — a literal and a shape can share a union, and the literal is what makes typos catchable.
**Check:** `backoff` must compile; add `@ts-expect-error` tests catching a policy that returns `true` and one that returns `'giveup'` (a plain `string` is not the literal).

### ⭐⭐⭐ 5. Errbacks and impossible states (challenge)

The Node-style convention is `(err, data)`: `type Errback = (err: Error | null, config?: AppConfig) => void`. Write that type and convince yourself it permits two nonsense calls — no error *and* no config, and an error *with* a config. Then replace it with a `ConfigResult` union (`'loaded'` carries the config, `'failed'` carries the error) and `declare function loadConfig(path: string, done: (result: ConfigResult) => void): void`.

**Practices:** seeing why "two nullable parameters" cannot express one outcome, and fixing it with a discriminated result.
**Hint:** with the union in place, aim your tests at the *producer* side — try building each impossible combination as an object literal.
**Check:** both nonsense `Errback` calls must compile (that's the point). With the union, `@ts-expect-error` tests must catch `{ status: 'loaded' }` (no config) and `{ status: 'failed', error, config }` (both at once).

### ⭐⭐⭐ 6. Promisify the result shape (challenge)

The README's footnote says that once an API is "one callback, one result object," promisifying is mechanical. Prove it. Write `Outcome<T, E>` (an `'ok'` branch with `value: T`, a `'failed'` branch with `error: E`) and a real `toPromise<T, E>(start)` that takes a starter function, hands it a `done` callback, and returns `Promise<T>`.

**Practices:** generic callback signatures, and the callback-to-Promise bridge that also kills the double-fire structurally.
**Hint:** `start: (done: (outcome: Outcome<T, E>) => void) => void`. Inside, `return new Promise<T>((resolve, reject) => start((outcome) => { ... }))` and narrow on `outcome.status`.
**Check:** `const saved: Promise<Note> = toPromise<Note, SaveFailure>((done) => saveNoteOutcome('milk', done))` must compile; a `@ts-expect-error` must catch the same call annotated `Promise<string>`.

## Solutions

### Solution 1

```ts
type ProgressHandler = (sent: number, total: number) => void;

declare function uploadFile(path: string, onProgress: ProgressHandler): void;

uploadFile('poster.png', (sent, total) => console.log(Math.round((sent / total) * 100)));
uploadFile('poster.png', (sent) => console.log(sent));
// @ts-expect-error — a ProgressHandler is handed numbers, not strings
uploadFile('poster.png', (sent: string) => console.log(sent));
```

WHY: `sent` and `total` need no annotations at the call site — they flow in from `ProgressHandler`, which is the payoff for naming the type once. Passing a one-parameter handler is legal on purpose: a function that ignores arguments it was offered is always safe, which is why `arr.map((x) => x)` works even though `map` passes three. Wrong parameter *types* are a different story, and that is the case the compiler catches.

### Solution 2

```ts
interface Note { id: number; text: string }

type SaveFailure = { kind: 'quota' | 'network'; retryAfterMs: number };
type NoteSaved = (note: Note) => void;
type NoteFailed = (failure: SaveFailure) => void;

declare function saveNote(text: string, onSaved: NoteSaved, onFailed: NoteFailed): void;

saveNote(
  'buy milk',
  (note) => console.log(note.text),
  (failure) => console.log(failure.kind, failure.retryAfterMs),
);

// @ts-expect-error — the failure payload is an object, not a bare reason string
const believesTheComment: NoteFailed = (reason: string) => console.log(reason);
// @ts-expect-error — onFailed is required: ignoring failure must be written down
saveNote('buy milk', (note) => console.log(note.id));
```

WHY: the comment claimed a "reason," the code sent an object — and with `onFailed?: Function` nothing could compare the two. Naming the payload puts the claim where the compiler can check it, so the handler that believed the comment now fails at the *declaration*, not in production while handling an error. Making `onFailed` required is the design half: optional error handlers make "errors vanish" the default behaviour of your API.

### Solution 3

```ts
type SaveResult =
  | { status: 'saved'; note: Note }
  | { status: 'failed'; kind: 'quota' | 'network'; retryAfterMs: number };

declare function saveNoteOnce(text: string, done: (result: SaveResult) => void): void;

saveNoteOnce('buy milk', (result) => {
  if (result.status === 'failed') {
    console.log(`${result.kind}: retry in ${result.retryAfterMs}ms`);
    return;
  }
  console.log(result.note.text);
});

saveNoteOnce('buy milk', (result) => {
  // @ts-expect-error — `note` does not exist until the union is narrowed
  console.log(result.note);
});
```

WHY: with two callbacks, "both fired," "neither fired," and "one fired twice" are all outside the type system's reach — the relationship between the parameters is unstatable. One parameter carrying a union states it: you will be handed one `SaveResult`, and it is one of these two shapes. The caller pays one `if` and gets both arms enforced, and the fields of each branch are only reachable once you have proved which branch you're in.

### Solution 4

```ts
type RetryDecision = number | 'give-up';
type RetryPolicy = (attempt: number, failure: SaveFailure) => RetryDecision;

const backoff: RetryPolicy = (attempt, failure) =>
  failure.kind === 'quota' ? 'give-up' : attempt * 250;

// @ts-expect-error — a policy answers with a delay or 'give-up', not a boolean
const alwaysRetry: RetryPolicy = () => true;
// @ts-expect-error — 'giveup' is not the literal 'give-up'
const typo: RetryPolicy = () => 'giveup';
```

WHY: a `void` return means "I don't care what you hand back"; a real return type means the callback is being *asked a question*, and the answer is checked. The union `number | 'give-up'` is the useful shape here — a measured value or one special word — and because `'give-up'` is a literal rather than `string`, the near-miss `'giveup'` is caught at the keyboard. `backoff`'s parameters stay unannotated: `RetryPolicy` supplies them.

### Solution 5

```ts
interface AppConfig { theme: string; retries: number }

type Errback = (err: Error | null, config?: AppConfig) => void;
declare const errback: Errback;
errback(null, undefined);                                  // no error AND no config
errback(new Error('boom'), { theme: 'dark', retries: 3 }); // error AND config

type ConfigResult =
  | { status: 'loaded'; config: AppConfig }
  | { status: 'failed'; error: Error };

declare function loadConfig(path: string, done: (result: ConfigResult) => void): void;

loadConfig('app.json', (result) => {
  if (result.status === 'failed') {
    console.log(result.error.message);
    return;
  }
  console.log(result.config.theme);
});

declare const report: (result: ConfigResult) => void;
// @ts-expect-error — 'loaded' must carry a config
report({ status: 'loaded' });
// @ts-expect-error — 'failed' cannot also carry a config
report({ status: 'failed', error: new Error('boom'), config: { theme: 'dark', retries: 3 } });
```

WHY: `(err: Error | null, config?: AppConfig)` describes two independently nullable slots, which is four combinations — and two of them are nonsense the compiler happily allows. Every consumer then writes `if (err) ... else if (config) ...` defensively, because the type never promised the slots were linked. The union has two combinations and no others: the discriminant selects a branch, so a `'failed'` literal carrying a `config` is rejected as an unknown property rather than quietly accepted. This is the same "make impossible states unrepresentable" move exercise 30 builds a whole lesson around.

### Solution 6

```ts
type Outcome<T, E> =
  | { status: 'ok'; value: T }
  | { status: 'failed'; error: E };

function toPromise<T, E>(start: (done: (outcome: Outcome<T, E>) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    start((outcome) => {
      if (outcome.status === 'ok') resolve(outcome.value);
      else reject(outcome.error);
    });
  });
}

declare function saveNoteOutcome(
  text: string,
  done: (outcome: Outcome<Note, SaveFailure>) => void,
): void;

const saved: Promise<Note> = toPromise<Note, SaveFailure>((done) => saveNoteOutcome('milk', done));
// @ts-expect-error — this promise resolves with a Note, not a string
const wrong: Promise<string> = toPromise<Note, SaveFailure>((done) => saveNoteOutcome('milk', done));
```

WHY: the whole adapter is nine lines because the callback already carried one fully described outcome — there was nothing left to guess about arity, order, or which parameter means failure. Note what the migration buys beyond tidiness: a promise settles exactly once, so the original's paste-bug double-fire becomes structurally impossible rather than merely discouraged. The generic parameters keep the bridge reusable: `T` is whatever the success branch carries, and the `done` callback inside `toPromise` needs no annotation because `start`'s type supplies it.
