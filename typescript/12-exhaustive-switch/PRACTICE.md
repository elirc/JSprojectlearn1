# 🏋️ Practice: Exhaustive Switches

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. Nothing here imports from `refactored/`; you'll write your own `assertNever`.

## Exercises

### ⭐ 1. The opening-hours board (warm-up)

A café's booking widget needs the hour it opens on each weekday. Declare `type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri'`, then a `Record<Weekday, string>` table called `OPENING_HOUR` with an entry per day, and `opensAt(day: Weekday): string` that reads from it. No switch, no `default` — the table *is* the exhaustiveness check.

**Practices:** using `Record<Union, V>` as a lookup that cannot be incomplete.
**Hint:** `Record<Weekday, string>` is an object type with all five keys required; `OPENING_HOUR[day]` is already typed `string`.
**Check:** must compile cleanly; add a second table that lists only `mon`, `tue`, `wed` with a `@ts-expect-error` above it — it must fire with roughly `Property 'thu' is missing`.

### ⭐⭐ 2. Fees that need real logic (core)

Checkout charges a surcharge that differs per payment method, so a value table won't do — each case computes. Declare `type PaymentMethod = 'card' | 'cash' | 'voucher'`, write your own `assertNever`, and write `surcharge(method: PaymentMethod, cents: number): number`: card is 1.5% rounded, cash is 0, and a voucher costs 100 only when `cents` exceeds 5000. End the switch with the sentinel.

**Practices:** the switch + `assertNever` idiom, for cases that branch instead of merely mapping.
**Hint:** `assertNever` takes a parameter typed `never` and returns `never`; write `return assertNever(method)` in `default` so the function's "always returns a number" promise stays satisfied.
**Check:** must compile cleanly. Then write a deliberately broken twin that handles only `'card'` and `'cash'`, and put `@ts-expect-error` above its `assertNever` call — it must fire with roughly `Argument of type '"voucher"' is not assignable to parameter of type 'never'`.

### ⭐⭐ 3. The union grows (core)

An alerting service classifies events as `'info' | 'warning' | 'error'`. Ops now wants a fourth level, `'critical'`. Add it to the union first, then follow the compiler: a `BADGE` table of `Record<Severity, string>` and a `shouldPage(level: Severity): boolean` switch both need updating. Fix both, then keep a stale copy of each — the pre-`'critical'` versions — as `@ts-expect-error` tests so the two failure sites are documented forever.

**Practices:** reading the compiler's todo list after a union gains a member, and pinning both failure shapes.
**Hint:** `'info'` and `'warning'` can share one branch by stacking `case` labels with no `break` between them.
**Check:** the fixed table and switch must compile cleanly; the stale table must error with roughly `Property 'critical' is missing`, and the stale switch's `assertNever` call must error with roughly `'"critical"' is not assignable to parameter of type 'never'`.

### ⭐⭐ 4. Exhaustiveness over a discriminated union (core)

Exercise 10's shapes, now with a sentinel. Define `type Shape` as a union of `{ kind: 'circle'; radius: number }`, `{ kind: 'square'; side: number }`, and `{ kind: 'rect'; width: number; height: number }`, then `area(shape: Shape): number` switching on `shape.kind` and ending in `assertNever(shape)`.

**Practices:** `assertNever` on an *object* union — the leftover in `default` is a whole member type, not a string literal.
**Hint:** switch on `shape.kind`, but pass the whole `shape` to `assertNever` — that's the value the compiler has narrowed to `never`.
**Check:** must compile cleanly; a twin that omits the `'rect'` case must error at `assertNever(shape)` with roughly `Type '{ kind: "rect"; ... }' is not assignable to parameter of type 'never'`.

### ⭐⭐⭐ 5. A table of functions (challenge)

Exercise 2 used a switch because each case needed logic. But a `Record` can hold *functions*, which gets you logic **and** table-style exhaustiveness with no `default` clause anywhere. Rebuild exercise 2's surcharge as `const SURCHARGE: Record<PaymentMethod, (cents: number) => number>`, then `surchargeFromTable(method, cents)` that looks up and calls.

**Practices:** collapsing the switch/table choice — the "cases need logic" objection dissolves when the values *are* the logic.
**Hint:** `cash: () => 0` is legal even though the type says one parameter — a function may ignore arguments it doesn't need.
**Check:** must compile cleanly and `SURCHARGE[method](cents)` must be typed `number`; a table missing the `voucher` entry must error with roughly `Property 'voucher' is missing`.

### ⭐⭐⭐ 6. A sentinel that degrades instead of throwing (challenge)

`assertNever` throws, which is right for a server but wrong for a render path — you'd rather show a placeholder than blank the page. Write `unreachable<T>(value: never, fallback: T): T` that logs a warning and returns the fallback, then use it in `badge(level: Severity): string` returning `'?'` for the impossible case. The compile-time tripwire must survive the change.

**Practices:** separating the two jobs `assertNever` does — the `never` parameter is the compile-time check, the `throw` is only the runtime net, and you can swap the second without losing the first.
**Hint:** the whole mechanism is the parameter type; `T` is inferred from `fallback`, so `unreachable(level, '?')` returns `string`.
**Check:** the complete `badge` must compile cleanly; a twin handling only `'info'` must error at the `unreachable` call with roughly `not assignable to parameter of type 'never'` — proving the softer runtime behaviour did not soften the compiler.

## Solutions

### Solution 1

```ts
type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

const OPENING_HOUR: Record<Weekday, string> = {
  mon: '09:00',
  tue: '09:00',
  wed: '09:00',
  thu: '09:00',
  fri: '08:00',
};

function opensAt(day: Weekday): string {
  return OPENING_HOUR[day];
}

// @ts-expect-error — Record demands every key; 'thu' and 'fri' are missing
const partialBoard: Record<Weekday, string> = { mon: '09:00', tue: '09:00', wed: '09:00' };
```

WHY: `Record<Weekday, string>` makes the object literal itself the completeness test — there is no `default` bucket to hide a forgotten day in, because there is no switch at all. `OPENING_HOUR[day]` returns `string` rather than `string | undefined` precisely because the type guarantees every key exists. Add `'sat'` to `Weekday` and this table stops compiling until you decide what Saturday's hour is.

### Solution 2

```ts
type PaymentMethod = 'card' | 'cash' | 'voucher';

function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

function surcharge(method: PaymentMethod, cents: number): number {
  switch (method) {
    case 'card': return Math.round(cents * 0.015);
    case 'cash': return 0;
    case 'voucher': return cents > 5000 ? 100 : 0;
    default:
      return assertNever(method);
  }
}

function brokenSurcharge(method: PaymentMethod): number {
  switch (method) {
    case 'card': return 15;
    case 'cash': return 0;
    default:
      // @ts-expect-error — 'voucher' is unhandled, so `method` is not `never`
      return assertNever(method);
  }
}
```

WHY: each handled `case` subtracts its literal from `method`'s type, so in a complete switch the `default` branch sees `never` and the call typechecks. `brokenSurcharge` is the same code with one case removed, and the leftover `'voucher'` is what the compiler refuses to pass to a `never` parameter — the error lands *at the switch that needs updating*, which is the whole point. Writing the broken twin as a permanent `@ts-expect-error` test turns "the mechanism works" into something CI re-proves on every run.

### Solution 3

```ts
type Severity = 'info' | 'warning' | 'error' | 'critical';

const BADGE: Record<Severity, string> = {
  info: 'i',
  warning: '!',
  error: 'x',
  critical: '!!',
};

function shouldPage(level: Severity): boolean {
  switch (level) {
    case 'info':
    case 'warning':
      return false;
    case 'error':
      return true;
    case 'critical':
      return true;
    default:
      return assertNever(level);
  }
}

// @ts-expect-error — the pre-'critical' table: Property 'critical' is missing
const staleBadges: Record<Severity, string> = { info: 'i', warning: '!', error: 'x' };

function staleShouldPage(level: Severity): boolean {
  switch (level) {
    case 'info':
    case 'warning':
      return false;
    case 'error':
      return true;
    default:
      // @ts-expect-error — 'critical' reaches here, so it is not `never`
      return assertNever(level);
  }
}
```

WHY: adding one word to the union produced exactly two compile errors, and those two errors *are* the change request — no grepping, no code review archaeology. The two stale copies show the two shapes the failure takes: a table reports a missing property, a switch reports a value that isn't `never`. Stacked `case` labels fall through to one body, which keeps `'info'` and `'warning'` sharing a branch without weakening the check — they are still individually subtracted.

### Solution 4

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.side ** 2;
    case 'rect':
      return shape.width * shape.height;
    default:
      return assertNever(shape);
  }
}

function brokenArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.side ** 2;
    default:
      // @ts-expect-error — the rect member is unhandled, so `shape` is not `never`
      return assertNever(shape);
  }
}
```

WHY: switching on the discriminant narrows the *whole object*, which is why `shape.radius` is legal inside `case 'circle'` and nowhere else. The value you hand the sentinel is `shape`, not `shape.kind` — `shape` is what got narrowed down to `never`, and the error message then names the entire unhandled member, telling you which variant you forgot. This pairing is the payoff the README describes: exercise 10 models the states, exercise 12 makes every consumer provably complete.

### Solution 5

```ts
const SURCHARGE: Record<PaymentMethod, (cents: number) => number> = {
  card: (cents) => Math.round(cents * 0.015),
  cash: () => 0,
  voucher: (cents) => (cents > 5000 ? 100 : 0),
};

function surchargeFromTable(method: PaymentMethod, cents: number): number {
  return SURCHARGE[method](cents);
}

// @ts-expect-error — a function table is exhaustive too: 'voucher' is missing
const partialTable: Record<PaymentMethod, (cents: number) => number> = {
  card: (cents) => cents,
  cash: () => 0,
};
```

WHY: "use a table for values, a switch for logic" is a useful default, not a law — a function *is* a value, so the table form scales to branching cases while keeping the strongest guarantee, an object literal that won't compile when incomplete. Note that `cents` needs no annotation in any entry: its type flows down from the `Record`'s value type, exercise 02's contextual inference doing the work. `cash: () => 0` is fine because JavaScript functions may ignore parameters, and TypeScript models that.

### Solution 6

```ts
function unreachable<T>(value: never, fallback: T): T {
  console.warn(`Unhandled case: ${String(value)}`);
  return fallback;
}

function badge(level: Severity): string {
  switch (level) {
    case 'info': return 'i';
    case 'warning': return '!';
    case 'error': return 'x';
    case 'critical': return '!!';
    default:
      return unreachable(level, '?');
  }
}

function brokenBadge(level: Severity): string {
  switch (level) {
    case 'info': return 'i';
    default:
      // @ts-expect-error — three levels unhandled, so `level` is not `never`
      return unreachable(level, '?');
  }
}
```

WHY: the sentinel's power lives entirely in `value: never` — the `throw` is a separate, purely runtime decision, so replacing it with a logged fallback costs nothing at compile time. That matters in UI code, where crashing on unexpected data is worse than rendering a placeholder, and it explains why LEARN.md's fifth experiment (retyping the parameter as `string`) destroys the whole mechanism while changing the body does not. `T` is inferred from `fallback`, so the helper keeps working wherever the surrounding function needs a different return type.
