# 🏋️ Practice: Generic Constraints

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. Everything here is self-contained, but `import type { Entity } from './refactored/constrained.js';` is available if you want it.

## Exercises

### ⭐ 1. Derive the constraint from the body (warm-up)

Here is the body you need, verbatim: `` const minutes = Math.floor(track.durationSec / 60); const seconds = track.durationSec % 60; return `${track.title} (${minutes}m${seconds}s)`; ``. Write the signature `summarizeTrack<T extends ...>(track: T): string` by reading which members that body touches, and no more. Then call it with a track object that also carries an `artist` field.

**Practices:** the README's decision rule — write the body first, and let the members it uses dictate the constraint.
**Hint:** two members, one `string` and one `number`, in an inline object type between the angle brackets.
**Check:** the three-field call must compile (extra properties are welcome); add `@ts-expect-error` tests catching `summarizeTrack({ title: 'Untitled' })` (roughly `Property 'durationSec' is missing`) and `summarizeTrack('Blue in Green')`.

### ⭐⭐ 2. A constrained generic over an array (core)

Write `interface Timestamped { createdAt: number }` and `newest<T extends Timestamped>(items: readonly T[]): T | null` — the item with the highest `createdAt`, or `null` for an empty array. Call it with notes that have a `body` field too, then read `body` off the result after checking for `null`.

**Practices:** a constraint riding along with exercise 16's `T | null`, and proving `T` still remembers fields the constraint never mentioned.
**Hint:** the constraint applies to the *element*, so it is `readonly T[]` with `T extends Timestamped`, not `readonly Timestamped[]`.
**Check:** `latest === null ? '(none)' : latest.body` must compile — if `body` errors, your return type forgot `T`; add a `@ts-expect-error` test catching `newest([{ body: 'orphan' }])`.

### ⭐⭐ 3. Shrink an over-fat constraint (core)

A colleague wrote `totalPriceFat<T extends { price: number; currency: string; sku: string }>(items: readonly T[]): number`, whose body only ever reads `item.price`. Prove the cost by calling it with `[{ price: 5 }]` and watching it be rejected, then write the minimal `totalPrice` alongside it and show the same call now compiles.

**Practices:** the "minimal constraint" rule — every requirement you add evicts callers who would have worked fine.
**Hint:** the body is `items.reduce((sum, item) => sum + item.price, 0)`; the constraint should name exactly the one member that appears in it.
**Check:** add a `@ts-expect-error` test on `totalPriceFat([{ price: 5 }])`, roughly `Type '{ price: number; }' does not satisfy the constraint`; then `totalPrice([{ price: 5 }])` and `totalPrice([{ price: 5, currency: 'EUR', sku: 'A1' }])` must both compile.

### ⭐⭐ 4. Constrain to a primitive and keep the literal (core)

Constraints do not have to be object shapes. Write `tagOf<T extends string>(name: T): { tag: T }`, and beside it the plain `looseTag(name: string): { tag: string }`. Call both with `'beta'` and compare what comes back — one of them remembers the exact literal, the other has widened it to `string`.

**Practices:** the memory half of "constraint = requirement, generic = memory", shown on a primitive instead of an object.
**Hint:** constraining a type parameter to `string` makes the compiler infer the *literal* type of the argument rather than widening it.
**Check:** `const exact: 'beta' = tagOf('beta').tag` must compile; add `@ts-expect-error` tests catching `const other: 'alpha' = tagOf('beta').tag` and `const widened: 'beta' = looseTag('beta').tag`.

### ⭐⭐⭐ 5. Delete the casts, then delete the generic (challenge)

A form helper reads `` `${(field as any).label}: ${(field as any).value}` `` and is declared `fieldSummary<T>(field: T): string`. First remove both casts by constraining `T` to a `FormField` interface. Then apply the README's second rule: `T` never appears in the return type, so rewrite it as a plain `(field: FormField): string`. Finally write `markRequired` — a function where the generic genuinely *does* earn its keep.

**Practices:** replacing cast-inside-a-generic with a constraint, then deciding whether the generic was needed at all.
**Hint:** `markRequired<T extends FormField>(field: T): T & { required: true }` with a spread body — and pass it an object carrying an extra `maxLength` to see what survives.
**Check:** `fieldSummary` must accept a variable holding extra properties; add a `@ts-expect-error` test catching `fieldSummary({ label: 'Age', value: 42 })`. Then `markRequired({ label: 'Name', value: 'Ada', maxLength: 40 }).maxLength` must compile as a `number`.

### ⭐⭐⭐ 6. Why you cannot build a `T` (challenge)

Write `translate<T extends Point>(p: T, dx: number, dy: number): T` for `interface Point { x: number; y: number }`. Try the obvious body first — `return { x: p.x + dx, y: p.y + dy };` — and read the error carefully; it is one of the most instructive messages in TypeScript. Then fix it so a caller passing `{ x, y, label }` gets its `label` back.

**Practices:** understanding that `T` is chosen by the *caller*, so the body can only ever transform the value it was handed, never manufacture a replacement.
**Hint:** the constraint says `T` is *at least* a `Point` — it might be more. Spread the original instead of building a fresh object.
**Check:** add a `@ts-expect-error` on the broken `return`, roughly `'{ x: number; y: number; }' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype`; the spread version must compile and `translate({ x: 1, y: 2, label: 'origin' }, 3, 4).label` must be a `string`.

## Solutions

### Solution 1

```ts
function summarizeTrack<T extends { title: string; durationSec: number }>(
  track: T,
): string {
  const minutes = Math.floor(track.durationSec / 60);
  const seconds = track.durationSec % 60;
  return `${track.title} (${minutes}m${seconds}s)`;
}

summarizeTrack({ title: 'Blue in Green', durationSec: 337, artist: 'Miles Davis' });

// @ts-expect-error — durationSec is missing
summarizeTrack({ title: 'Untitled' });

// @ts-expect-error — a bare string is not a track
summarizeTrack('Blue in Green');
```

WHY: the constraint is written by reading the body, not by guessing — `title` and `durationSec` are touched, so those two are required and nothing else is. Both accesses then compile *because* they are required: the constraint is the permission. The `artist` field sails through untouched, which is structural typing doing its job — the argument only has to be *at least* the constrained shape, and object literals passed to an inferred `T` are not subject to the usual excess-property complaint.

### Solution 2

```ts
interface Timestamped {
  createdAt: number;
}

function newest<T extends Timestamped>(items: readonly T[]): T | null {
  if (items.length === 0) return null;
  let best = items[0]!;
  for (const item of items) {
    if (item.createdAt > best.createdAt) best = item;
  }
  return best;
}

const notes = [
  { createdAt: 10, body: 'first' },
  { createdAt: 40, body: 'latest' },
];

const latest = newest(notes);
const body = latest === null ? '(none)' : latest.body;

// @ts-expect-error — no createdAt, so not Timestamped
newest([{ body: 'orphan' }]);
```

WHY: constraining the *element* rather than typing the parameter `readonly Timestamped[]` is what keeps `body` reachable on the result — `T` was inferred as the note's full type and carried through the `T | null` return. Written the plain way the return would have been `Timestamped | null` and `latest.body` would fail, which is exactly the memory loss the README warns about. The `| null` from exercise 16 is untouched by the constraint: the two ideas compose, and the caller still has to check.

### Solution 3

```ts
function totalPriceFat<
  T extends { price: number; currency: string; sku: string },
>(items: readonly T[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// @ts-expect-error — rejected for missing currency and sku it never reads
totalPriceFat([{ price: 5 }]);

function totalPrice<T extends { price: number }>(items: readonly T[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

const due: number = totalPrice([{ price: 5 }, { price: 12 }]);
const due2: number = totalPrice([{ price: 5, currency: 'EUR', sku: 'A1' }]);
```

WHY: the two functions have identical bodies and wildly different reach — the fat constraint turns away a perfectly valid caller over fields it would never have looked at. Constraints are a fence with two sides: everything you demand becomes usable in the body, and everything you demand also becomes a barrier at the door, so asking for more than you use is pure cost. Worth noticing as a bonus: `T` never appears in `totalPrice`'s return either, so by exercise 5's rule a plain `items: readonly { price: number }[]` would have done the same job here.

### Solution 4

```ts
function tagOf<T extends string>(name: T): { tag: T } {
  return { tag: name };
}

const beta = tagOf('beta');
const exact: 'beta' = beta.tag;

// @ts-expect-error — T remembered the exact literal 'beta'
const other: 'alpha' = beta.tag;

function looseTag(name: string): { tag: string } {
  return { tag: name };
}

// @ts-expect-error — the plain string parameter widened it away
const widened: 'beta' = looseTag('beta').tag;
```

WHY: a constraint is any type, not just an object shape, and `T extends string` changes inference in a way worth memorizing — when a type parameter is constrained to a primitive, the compiler infers the argument's *literal* type instead of widening it to `string`. So `tagOf('beta')` is a `{ tag: 'beta' }` while `looseTag('beta')` is a `{ tag: string }` that has forgotten which string it was. This is the same "generic = memory" idea as `tagEntity`, and it is the machinery behind the literal-preserving library signatures you will meet again in exercises 26 and 31.

### Solution 5

```ts
interface FormField {
  label: string;
  value: string;
}

function fieldSummary(field: FormField): string {
  return `${field.label}: ${field.value}`;
}

const nameField = { label: 'Name', value: 'Ada', required: true };
const summary = fieldSummary(nameField);

// @ts-expect-error — a numeric value is not a FormField
fieldSummary({ label: 'Age', value: 42 });

function markRequired<T extends FormField>(field: T): T & { required: true } {
  return { ...field, required: true };
}

const marked = markRequired({ label: 'Name', value: 'Ada', maxLength: 40 });
const maxLength: number = marked.maxLength;
const req: true = marked.required;
```

WHY: the casts vanish the moment the requirement is stated, because `label` and `value` become guaranteed rather than hoped for — and with them goes the `"#undefined: undefined"` class of bug. Then the second question: `fieldSummary` returns a `string`, so `T` appears nowhere in the output and the generic was pure ceremony; a plain parameter is simpler and equally safe. `markRequired` is the contrast — its return mentions `T`, so the generic is doing real work, and `maxLength` survives the round trip where an `(field: FormField): FormField & ...` version would have dropped it.

### Solution 6

```ts
interface Point {
  x: number;
  y: number;
}

function translateBroken<T extends Point>(p: T, dx: number, dy: number): T {
  // @ts-expect-error — T may be a SUBTYPE of Point; a bare {x, y} is not a T
  return { x: p.x + dx, y: p.y + dy };
}

function translate<T extends Point>(p: T, dx: number, dy: number): T {
  return { ...p, x: p.x + dx, y: p.y + dy };
}

const labelled = { x: 1, y: 2, label: 'origin' };
const moved = translate(labelled, 3, 4);
const stillLabelled: string = moved.label;
```

WHY: `T` is picked by the caller, so promising to return a `T` means promising to return *whatever they passed the type of* — and `{ x, y }` is only a `Point`, which is not enough when the caller chose `{ x, y, label }`. The compiler's phrasing, "`T` could be instantiated with a different subtype", is it telling you that some future caller would be handed an object missing fields your signature guaranteed. Spreading the original fixes it honestly: `{ ...p, x, y }` starts from every field of the caller's object and overrides two, so `label` is still there at runtime and the type says so.
