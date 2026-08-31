# 🏋️ Practice: satisfies vs as

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. These use a new API-client domain, so declare your own interfaces rather than importing from `refactored/config.js`.

## Exercises

### ⭐ 1. Retire an `as` (warm-up)

An HTTP client declares `interface Endpoint { url: string; method: string; timeoutMs: number }`, and a colleague wrote `const search = { url: '/api/search', method: 'GET' } as Endpoint;` — which compiles despite the missing timeout. Rewrite it with `satisfies Endpoint`, adding the field it was hiding, and then pin both failure modes `as` had suppressed.

**Practices:** swapping the assertion for the checked-and-precise tool, and seeing what the assertion was covering up.
**Hint:** `satisfies` goes after the closing brace, where `as` used to be. Keep the typo test on a single line — the compiler reports an excess property at the property itself, so a `@ts-expect-error` above a multi-line literal won't line up with it.
**Check:** the three-field version must compile cleanly; the two-field version must error with roughly `Property 'timeoutMs' is missing`, and a version with an extra `timoutMs: 500` must error with roughly `'timoutMs' does not exist in type 'Endpoint'`.

### ⭐⭐ 2. The keys the annotation forgot (core)

Build a feature-flag registry with `darkMode`, `betaSearch`, and `offlineSync`, all booleans, checked with `satisfies Record<string, boolean>`. Then build the *annotated* twin, `const annotatedFlags: Record<string, boolean> = { ... }` with identical contents, and read a misspelled key off each. One of those reads is a compile error and the other is a silent `undefined`.

**Practices:** the exact difference the README calls "checked but widened" — same check, opposite memory of which keys exist.
**Hint:** `Record<string, boolean>` promises *any* string key is present, which is why the annotated read compiles; `satisfies` verifies the same contract but leaves the variable's inferred key set intact.
**Check:** `flags.drakMode` must error with roughly `Property 'drakMode' does not exist` (pin it with `@ts-expect-error`), while `annotatedFlags.drakMode` must compile as a `boolean` — that compiling line is the bug this exercise is about.

### ⭐⭐ 3. Precision inside the values (core)

Now the contract is looser: `satisfies Record<string, string | number | boolean>` over `{ host: 'localhost', port: 8080, debug: false }`. Call `settings.port.toFixed(0)` and `settings.host.toUpperCase()`. Then do the same on an annotated twin and watch it fall apart.

**Practices:** noticing that `satisfies` preserves each property's own type, while an annotation flattens every property to the whole union.
**Hint:** `satisfies` supplies the contract as *context* for inference rather than replacing the inferred type, so `port` stays `number` even though the contract permits three types.
**Check:** both method calls must compile cleanly on the `satisfies` version; `annotatedSettings.port.toFixed(0)` must error with roughly `Property 'toFixed' does not exist on type 'string | number | boolean'` — pin it with `@ts-expect-error`.

### ⭐⭐ 4. Pick the right tool three times (core)

Three declarations, three different answers. (a) A `mode` that starts `'idle'` and will later be reassigned to `'busy'` — which tool lets that happen? (b) A `startMode` constant that should keep knowing it is exactly `'idle'`. (c) A `readCount(json: string): number` that reads a bare number out of JSON and falls back to `0`. Write all three and justify each choice in a comment.

**Practices:** the decision table as a reflex — annotate to widen on purpose, `satisfies` to check without changing, `as` only to remove capability.
**Hint:** (a) is the case where widening is the *feature*; (c) is the one legitimate assertion, `any → unknown`, which buys you nothing until you narrow.
**Check:** `mode = 'busy'` must compile; assigning `startMode` to a `const reassigned: 'busy'` must error (pin with `@ts-expect-error`), proving the literal type survived; and `const unchecked: number = JSON.parse('1') as unknown;` must error with roughly `Type 'unknown' is not assignable to type 'number'`.

### ⭐⭐⭐ 5. A contract with a finite key set (challenge)

Swap `Record<string, string>` for `Record<Locale, string>` where `type Locale = 'en' | 'fr' | 'de'`, and build a `greeting` table with `satisfies`. This buys you two guarantees at once: the exhaustiveness of exercise 12 (every locale must have an entry) *and* the key precision of `satisfies` (only real locales may be read back).

**Practices:** choosing a key type that is a union rather than `string`, so the contract itself enforces completeness.
**Hint:** keep each failing literal on one line so its `@ts-expect-error` lands on the right row.
**Check:** the full table and `greeting.fr` must compile; a table missing `de` must error with roughly `Property 'de' is missing`; a table with an extra `es: 'Hola'` must error with roughly `'es' does not exist in type 'Record<Locale, string>'`; and reading `greeting.nl` must error too.

### ⭐⭐⭐ 6. De-`as` a module (challenge)

You inherit a job runner with three sins: `const job = { id: 'j1', queue: 'email' } as Job;` (missing `retries`, and it compiles), `const limits: Record<string, number> = { email: 5, sms: 3, push: 10 };` (so `limits.sms_` compiles and is `undefined`), and `const parsed = JSON.parse(raw) as Job;` (laundering, exercise 13's original sin). Rewrite all three so the file contains exactly one `as` — the safe `any → unknown` one — using `interface Job { id: string; retries: number; queue: string }`.

**Practices:** applying the decision table across a whole file, including the case where the honest fix is not `satisfies` at all but a runtime guard.
**Hint:** sins one and two are `satisfies` jobs; sin three cannot be fixed by any keyword, because no keyword inspects a string at runtime — it needs `isJob` and a `Job | null` return.
**Check:** the rewritten file must compile cleanly; `limits.sms_` must now error, `{ id: 'j1', queue: 'email' } satisfies Job` must error with roughly `Property 'retries' is missing`, and `{ email: 5, sms: '3' } satisfies Record<string, number>` must error with roughly `Type 'string' is not assignable to type 'number'`.

## Solutions

### Solution 1

```ts
interface Endpoint {
  url: string;
  method: string;
  timeoutMs: number;
}

const searchEndpoint = { url: '/api/search', method: 'GET', timeoutMs: 2000 } satisfies Endpoint;

// @ts-expect-error — Property 'timeoutMs' is missing; `as Endpoint` waved this through
const missingField = { url: '/api/search', method: 'GET' } satisfies Endpoint;

// @ts-expect-error — 'timoutMs' does not exist in type 'Endpoint'
const typoField = { url: '/api/search', method: 'GET', timeoutMs: 2000, timoutMs: 500 } satisfies Endpoint;
```

WHY: `as` and `satisfies` occupy the same syntactic slot, which is exactly why the swap is so cheap and so worth making — one is a claim, the other is a check. The missing field is the failure `as` is famous for; the excess field is the subtler one, because excess-property checking only runs when an object *literal* meets a known type, and `as` opts out of that meeting entirely. Keeping both as `@ts-expect-error` tests means the two bugs can never quietly return.

### Solution 2

```ts
const flags = {
  darkMode: true,
  betaSearch: false,
  offlineSync: true,
} satisfies Record<string, boolean>;

const darkOn: boolean = flags.darkMode;

// @ts-expect-error — Property 'drakMode' does not exist: satisfies kept the keys
const typoRead: boolean = flags.drakMode;

const annotatedFlags: Record<string, boolean> = {
  darkMode: true,
  betaSearch: false,
  offlineSync: true,
};
const silentUndefined: boolean = annotatedFlags.drakMode; // compiles — and is undefined
```

WHY: both declarations were checked identically — every value had to be a boolean — so the difference is purely in what the *variable's* type remembers afterwards. `Record<string, boolean>` is a promise that all string keys resolve to a boolean, so the compiler cannot flag `drakMode`; it hands back a `boolean` that is really `undefined`, and the flag reads as off forever. `satisfies` verifies the same contract and then steps out of the way, leaving the three-key inferred type in place to catch the typo.

### Solution 3

```ts
const settings = {
  host: 'localhost',
  port: 8080,
  debug: false,
} satisfies Record<string, string | number | boolean>;

const portLabel: string = settings.port.toFixed(0);
const upperHost: string = settings.host.toUpperCase();

const annotatedSettings: Record<string, string | number | boolean> = {
  host: 'localhost',
  port: 8080,
  debug: false,
};
// @ts-expect-error — the annotation widened every value to the whole union
const widenedPort: string = annotatedSettings.port.toFixed(0);
```

WHY: an annotation *replaces* the value's type, so every property of `annotatedSettings` becomes the full `string | number | boolean` union and only members common to all three remain callable — which is almost nothing. `satisfies` uses the contract as a contextual type instead: `8080` is checked against the union, then keeps the narrower `number` the compiler inferred for it. Note what it does *not* do — the properties are `number` and `string`, not the literal types `8080` and `'localhost'`; that extra step needs `as const satisfies`, which is exercise 31's business.

### Solution 4

```ts
// (a) annotate: widening is the point — the variable must accept 'busy' later
let mode: 'idle' | 'busy' = 'idle';
mode = 'busy';

// (b) satisfies: checked against the union, but the literal type is kept
const startMode = 'idle' satisfies 'idle' | 'busy';
// @ts-expect-error — satisfies kept the literal type 'idle'
const reassigned: 'busy' = startMode;

// (c) as: legitimate only because it REMOVES capability (any -> unknown)
function readCount(json: string): number {
  const data = JSON.parse(json) as unknown;
  return typeof data === 'number' ? data : 0;
}

// @ts-expect-error — `as unknown` removes power; you may do nothing until you check
const unchecked: number = JSON.parse('1') as unknown;
```

WHY: (a) is the case people forget `:` is for — a `const startMode = 'idle'` would be stuck at `'idle'`, so the annotation's widening is a feature, not a loss. (b) shows `satisfies` works on primitives too, not just object literals: the contract is verified and the precise type survives, which is why the assignment to `'busy'` fails. (c) is the one `as` this track endorses, and the last line shows why it is safe: demoting to `unknown` closes doors rather than opening them, so the value stays useless until a real check earns it a type.

### Solution 5

```ts
type Locale = 'en' | 'fr' | 'de';

const greeting = { en: 'Hello', fr: 'Bonjour', de: 'Hallo' } satisfies Record<Locale, string>;

const french: string = greeting.fr;

// @ts-expect-error — Property 'de' is missing: the key union must be covered
const incompleteGreeting = { en: 'Hello', fr: 'Bonjour' } satisfies Record<Locale, string>;

// @ts-expect-error — 'es' is not a Locale
const bogusGreeting = { en: 'Hello', fr: 'Bonjour', de: 'Hallo', es: 'Hola' } satisfies Record<Locale, string>;

// @ts-expect-error — 'nl' is not a key of the greeting table
const missingLookup: string = greeting.nl;
```

WHY: the key type is doing three jobs here. As a finite union it makes the table exhaustive, so adding a fourth locale breaks this literal until it is translated — exercise 12's `Record` trick, unchanged. As a *closed* set it rejects `es`, which `Record<string, string>` would have accepted silently. And because `satisfies` leaves the inferred type alone, `greeting.nl` fails on the read side too, so both writing and reading the table are checked.

### Solution 6

```ts
interface Job {
  id: string;
  retries: number;
  queue: string;
}

const job = { id: 'j1', retries: 3, queue: 'email' } satisfies Job;

const limits = { email: 5, sms: 3, push: 10 } satisfies Record<string, number>;
const smsLimit: number = limits.sms;

// @ts-expect-error — the widening bug is now a compile error
const typoLimit: number = limits.sms_;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isJob(value: unknown): value is Job {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.retries === 'number' &&
    typeof value.queue === 'string'
  );
}

function parseJob(json: string): Job | null {
  let data: unknown;
  try {
    data = JSON.parse(json) as unknown;
  } catch {
    return null;
  }
  return isJob(data) ? data : null;
}

// @ts-expect-error — Property 'retries' is missing (the `as Job` version compiled)
const halfJob = { id: 'j1', queue: 'email' } satisfies Job;

// @ts-expect-error — Type 'string' is not assignable to type 'number'
const badLimits = { email: 5, sms: '3' } satisfies Record<string, number>;
```

WHY: two of the three sins were fixed by changing a keyword, which is the encouraging half of this lesson — `satisfies` restores the check `as` removed and the precision `:` discarded, at no cost. The third sin is the instructive half: no keyword can fix `JSON.parse(raw) as Job`, because the problem is not which type is claimed but that *nothing looked at the data*. That one needs exercise 13's guard and an honest `Job | null`, leaving a single `as` in the file — the `any → unknown` demotion, which only ever takes power away.
