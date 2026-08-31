# 🏋️ Practice: Discriminated Unions

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. Every exercise here is a *design* exercise: write the type first, then let the compiler tell you what the code must do.

## Exercises

### ⭐ 1. Three states, one tag (warm-up)

A stopwatch is either stopped, running (and knows when it started), or paused (and knows how much time has accumulated). Write `type Timer` as a three-variant union tagged with `kind`, giving each variant *only* the field that state actually has. Then write `describeTimer(timer: Timer): string` as a `switch (timer.kind)`.

**Practices:** the mechanical recipe — list the states, one variant each, tag with a literal field, narrow with `switch`.
**Hint:** the stopped variant has no fields besides `kind`. Resist adding `startedAt: number | null` to all three.
**Check:** `timer.startedAt` outside a `switch` must error with roughly `Property 'startedAt' does not exist on type 'Timer'`, and `{ kind: 'stopped', startedAt: 1 }` must be rejected — add a `@ts-expect-error` test for each.

### ⭐⭐ 2. Retire a bag of optionals (core)

A notification service uses one loose interface: `{ channel: 'email' | 'sms' | 'push'; title: string; emailAddress?: string; phoneNumber?: string; deviceToken?: string }`. Count how many field combinations it can represent versus how many are meaningful. Redesign it as `type Delivery` — one variant per channel, each carrying `title` plus exactly its own destination field — and write `deliver(delivery: Delivery): string`.

**Practices:** converting optional-field soup into states, and watching the `??` fallbacks in the consumer disappear.
**Hint:** `channel` is already a literal union, so it is *already* your discriminant — you only have to split the fields across it.
**Check:** `deliver` must read `delivery.emailAddress` with no `??` fallback. Add `@ts-expect-error` tests catching an sms that also carries `emailAddress`, and an email with a `title` but no address.

### ⭐⭐ 3. Extend a union, follow the errors (core)

Model a parcel: `Pending` (just an `orderId`), `InTransit` (`orderId`, `carrier`, `etaDays`), `Delivered` (`orderId`, `signedBy`). Give each variant its **own named interface**, then `type Shipment` as their union, and write `track(shipment: Shipment): string`. Now add a fourth state — `Returned` with a `reason` — to the union *without* touching `track`, run the typechecker, and read what it says before you fix it.

**Practices:** naming variants so single-state functions can be typed, plus the maintenance payoff of a union: adding a state hands you a to-do list.
**Hint:** because the variants are named, you can write `etaLabel(leg: InTransit): string` and a `Delivered` won't be accepted at the call site.
**Check:** before you add `case 'returned'`, `track` must error with roughly `Function lacks ending return statement and return type does not include 'undefined'`. Then add a `@ts-expect-error` test proving `etaLabel(someDeliveredShipment)` is rejected.

### ⭐⭐ 4. Transitions that replace, not patch (core)

A music player is `idle`, `buffering` (has a `trackId`), `playing` (`trackId` + `positionSec`), or `failed` (`trackId` + `message`). Write `type Player`, then three transitions: `load(trackId: string): Player`, `started(player: Player): Player` (a buffering player becomes playing at position 0; anything else passes through), and `seek(player: Player, sec: number): Player` (only a playing player moves). Each transition must **return a new object**, never mutate the argument.

**Practices:** narrowing with `if (player.state !== '...') return player;` and building the next state wholesale, which is what stops stale fields from surviving a transition.
**Hint:** inside `seek`, once you've narrowed, `{ ...player, positionSec: sec }` is a complete playing variant — the spread is safe precisely *because* you narrowed first.
**Check:** `player.positionSec` on an un-narrowed `Player` must error with roughly `Property 'positionSec' does not exist on type 'Player'`; `{ state: 'idle', trackId: 't1' }` must be rejected. Pin both with `@ts-expect-error`.

### ⭐⭐⭐ 5. One field, a different type per variant (challenge)

Form fields share a `value`, but its type depends on the field: `text` has `value: string` and `maxLength`, `number` has `value: number` plus `min`/`max`, `select` has `value: string` plus `options: readonly string[]`. Write `type Field` (all variants also carry a `label`) and `validate(field: Field): string | null` returning an error message or `null`.

**Practices:** discovering that a discriminated union gives a *shared* field a precise per-variant type — the union member type outside, the exact type inside each case.
**Hint:** before writing `validate`, hover `field.value` on the bare union. It is `string | number`, which is why the compiler blocks `.toUpperCase()` there but allows it inside `case 'text'`.
**Check:** `field.value.toUpperCase()` on an un-narrowed `Field` must error with roughly `Property 'toUpperCase' does not exist on type 'string | number'` — pin it with `@ts-expect-error`. `validate` must compile with no trailing `return` after the switch.

### ⭐⭐⭐ 6. Two independent axes (challenge)

A calendar entry has a title and **two independent** questions: *when* (all-day, carrying a `date`; or timed, carrying `start` and `end`) and *how often* (once; or weekly, carrying `weekday` and `until`). A single flat union would need four variants and would re-list the repeat fields in each. Instead write two small unions, `When` and `Repeat`, and an `interface CalendarEvent` that holds one of each, then `describeEvent(event: CalendarEvent): string`.

**Practices:** composing unions by nesting instead of multiplying variants — and narrowing through a property path (`event.when.kind === '...'`) rather than on the top-level object.
**Hint:** `event.when.kind === 'all-day'` narrows `event.when`, not `event`; that's enough to reach `event.when.date` inside the branch.
**Check:** must compile cleanly, including narrowing inside a ternary. Add a `@ts-expect-error` test for an event whose `when` is `{ kind: 'all-day', start: '09:00', end: '17:00' }` — and put the directive on the line directly above `when:`, since it only ever suppresses the next line.

## Solutions

### Solution 1

```ts
type Timer =
  | { kind: 'stopped' }
  | { kind: 'running'; startedAt: number }
  | { kind: 'paused'; elapsedMs: number };

function describeTimer(timer: Timer): string {
  switch (timer.kind) {
    case 'stopped': return 'stopped';
    case 'running': return `running since ${timer.startedAt}`;
    case 'paused': return `paused at ${timer.elapsedMs}ms`;
  }
}

declare const someTimer: Timer;
// @ts-expect-error — startedAt exists only on the running variant
someTimer.startedAt;
// @ts-expect-error — a stopped timer carries no start time
const bogusTimer: Timer = { kind: 'stopped', startedAt: 1 };
```

WHY: three variants means exactly three representable values — there is no `{ stopped, startedAt }` to construct and therefore no "did we remember to clear it?" question. Note the function needs no `return` after the switch: the compiler sees every variant handled and knows control can't reach the end.

### Solution 2

```ts
type Delivery =
  | { channel: 'email'; title: string; emailAddress: string }
  | { channel: 'sms'; title: string; phoneNumber: string }
  | { channel: 'push'; title: string; deviceToken: string };

function deliver(delivery: Delivery): string {
  switch (delivery.channel) {
    case 'email': return `emailing "${delivery.title}" to ${delivery.emailAddress}`;
    case 'sms':   return `texting "${delivery.title}" to ${delivery.phoneNumber}`;
    case 'push':  return `pushing "${delivery.title}" to ${delivery.deviceToken}`;
  }
}

// note: @ts-expect-error only covers the NEXT line — keep these literals on one line
// @ts-expect-error — an sms carries a phone number, never an email address
const crossed: Delivery = { channel: 'sms', title: 'Hi', phoneNumber: '555-0100', emailAddress: 'a@b.c' };
// @ts-expect-error — email without an address is not a deliverable state
const halfBuilt: Delivery = { channel: 'email', title: 'Hi' };
```

WHY: the loose interface allowed 3 channels × 2 × 2 × 2 = 24 shapes for 3 real states, and its consumer had to write `delivery.emailAddress ?? '(no address?)'` in the one branch where an address is guaranteed. Splitting on the discriminant deletes both problems at once: 3 states, and every field read inside a case is a plain non-optional value. The `crossed` test is the interesting one — because `channel: 'sms'` picks a single variant, the stray `emailAddress` is caught as an excess property rather than being tolerated as "valid for *some* member of the union."

### Solution 3

```ts
interface Pending   { status: 'pending';    orderId: string }
interface InTransit { status: 'in-transit'; orderId: string; carrier: string; etaDays: number }
interface Delivered { status: 'delivered';  orderId: string; signedBy: string }
interface Returned  { status: 'returned';   orderId: string; reason: string }

type Shipment = Pending | InTransit | Delivered | Returned;

function track(shipment: Shipment): string {
  switch (shipment.status) {
    case 'pending':    return `${shipment.orderId} is awaiting pickup`;
    case 'in-transit': return `${shipment.orderId} is with ${shipment.carrier}, ${shipment.etaDays} day(s) out`;
    case 'delivered':  return `${shipment.orderId} was signed for by ${shipment.signedBy}`;
    case 'returned':   return `${shipment.orderId} came back: ${shipment.reason}`;
  }
}

function etaLabel(leg: InTransit): string {
  return `${leg.carrier}: ${leg.etaDays} day(s)`;
}

declare const delivered: Delivered;
// @ts-expect-error — etaLabel accepts only the in-transit variant
etaLabel(delivered);
```

WHY: naming each variant costs four extra lines and buys two things. First, functions that only make sense for one state can *say so* in their signature — `etaLabel` structurally cannot receive a delivered parcel. Second, adding `Returned` to the union turned every switch that didn't handle it into a compile error, so the compiler wrote the migration to-do list. Exercise 12 sharpens that error from "lacks ending return statement" into a message that names the state you forgot.

### Solution 4

```ts
type Player =
  | { state: 'idle' }
  | { state: 'buffering'; trackId: string }
  | { state: 'playing';   trackId: string; positionSec: number }
  | { state: 'failed';    trackId: string; message: string };

function load(trackId: string): Player {
  return { state: 'buffering', trackId };
}

function started(player: Player): Player {
  if (player.state !== 'buffering') return player;
  return { state: 'playing', trackId: player.trackId, positionSec: 0 };
}

function seek(player: Player, sec: number): Player {
  if (player.state !== 'playing') return player;
  return { ...player, positionSec: sec };
}

declare const player: Player;
// @ts-expect-error — positionSec lives only on the playing variant
player.positionSec;
// @ts-expect-error — idle carries no track
const bogusPlayer: Player = { state: 'idle', trackId: 't1' };
```

WHY: `!==` narrows by exclusion, so after the early return the remaining type is the single variant you want — `player.trackId` in `started` is a guaranteed `string`. Building the successor object from scratch (or spreading an already-narrowed one) is what makes stale state impossible: there is no moment where a half-updated object exists, because the old value is never edited. Compare the mutation style, where forgetting to clear `positionSec` leaves a playing field on a buffering object — a shape this type simply can't hold.

### Solution 5

```ts
type Field =
  | { kind: 'text';   label: string; value: string; maxLength: number }
  | { kind: 'number'; label: string; value: number; min: number; max: number }
  | { kind: 'select'; label: string; value: string; options: readonly string[] };

function validate(field: Field): string | null {
  switch (field.kind) {
    case 'text':
      return field.value.length > field.maxLength ? `${field.label} is too long` : null;
    case 'number':
      if (field.value < field.min) return `${field.label} is below ${field.min}`;
      if (field.value > field.max) return `${field.label} is above ${field.max}`;
      return null;
    case 'select':
      return field.options.includes(field.value) ? null : `${field.label} has an unknown option`;
  }
}

declare const field: Field;
// @ts-expect-error — on the un-narrowed union, value is string | number
field.value.toUpperCase();
```

WHY: a field present in every variant is still readable on the bare union — but at the *union* of its per-variant types, here `string | number`, which supports only what both support. Narrowing on `kind` resolves it to one exact type, so `field.value.length` and `field.value < field.min` are both fine in their own cases. This is the pattern behind every "same field, different payload" API, and it means you never need a `typeof field.value === 'string'` check inside a branch that already knows.

### Solution 6

```ts
type When =
  | { kind: 'all-day'; date: string }
  | { kind: 'timed'; start: string; end: string };

type Repeat =
  | { kind: 'once' }
  | { kind: 'weekly'; weekday: number; until: string };

interface CalendarEvent {
  title: string;
  when: When;
  repeat: Repeat;
}

function describeEvent(event: CalendarEvent): string {
  const when = event.when.kind === 'all-day'
    ? `all day on ${event.when.date}`
    : `${event.when.start} to ${event.when.end}`;
  const repeat = event.repeat.kind === 'once'
    ? 'once'
    : `weekly on day ${event.repeat.weekday} until ${event.repeat.until}`;
  return `${event.title}: ${when}, ${repeat}`;
}

const badEvent: CalendarEvent = {
  title: 'Holiday',
  // @ts-expect-error — an all-day slot has a date, not a start/end pair
  when: { kind: 'all-day', start: '09:00', end: '17:00' },
  repeat: { kind: 'once' },
};
```

WHY: two independent questions multiply — flattening them would need 2 × 2 = 4 variants, and every new repeat rule would double the list again. Nesting keeps them additive: `When` and `Repeat` evolve separately, and a consumer that only cares about timing narrows only `event.when`. TypeScript narrows dotted paths, so `event.when.kind === 'all-day'` refines `event.when` for the rest of that expression — including inside a ternary — which is why no intermediate `const when = event.when` is needed.
