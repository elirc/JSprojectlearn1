# 🏋️ Practice: Type Guards

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}` so it's a module) — `npm run typecheck` from the `typescript/` folder picks it up. Several exercises reuse `isRecord`; write it once at the top and build on it.

## Exercises

### ⭐ 1. `boolean` versus `value is T` (warm-up)

Write the same check twice: `looksLikeString(value: unknown): boolean` and `isString(value: unknown): value is string`, both with the body `typeof value === 'string'`. Call each inside an `if` and try to use `.toUpperCase()` on the argument. Then add `isNonEmptyString(value: unknown): value is string`, which also rejects whitespace-only strings.

**Practices:** seeing that the *signature*, not the body, is what teaches the compiler — the two functions do identical work at runtime.
**Hint:** identical bodies, different return types, opposite outcomes at the call site. That difference is the entire feature.
**Check:** inside `if (looksLikeString(raw))`, `raw.toUpperCase()` must error with roughly `'raw' is of type 'unknown'` — pin it with `@ts-expect-error`. The same line under `if (isString(raw))` must compile with no directive.

### ⭐⭐ 2. A guard for an array field (core)

A plugin loader reads `interface Manifest { name: string; version: string; permissions: string[] }` from a JSON file. Write a reusable `isStringArray(value: unknown): value is string[]`, then `isManifest` using `isRecord` and `isStringArray`, then `parseManifest(json: string): Manifest` that parses, guards, and throws `'malformed manifest'` on bad data.

**Practices:** validating a *collection* field honestly — checking that it's an array is not the same as checking what's in it.
**Hint:** `Array.isArray(value) && value.every((item) => typeof item === 'string')` — the `every` is the half people skip.
**Check:** write a second copy of `parseManifest` with the guard removed; its `return data` must error with roughly `Type 'unknown' is not assignable to type 'Manifest'`, pinned with `@ts-expect-error`. The guarded version must compile with no cast.

### ⭐⭐ 3. Guards refine `.filter` (core)

A geometry library exports three untagged interfaces: `Circle { radius: number }`, `Rect { width: number; height: number }`, `Segment { length: number }`, and `type Shape` is their union. Write `isCircle(shape: Shape): shape is Circle` using `in`, then use it to pull the circles out of a `Shape[]` and sum their areas. Also write `looksCircular(shape: Shape): boolean` with the identical body, and try filtering with that instead.

**Practices:** discovering that `Array.prototype.filter` has a type-predicate overload — a guard changes the *element type* of the result, not just which elements survive.
**Hint:** the predicate version narrows the parameter from a union to one member, so `S extends T` in `filter`'s signature can lock onto `Circle`.
**Check:** `const circles: Circle[] = shapes.filter(isCircle)` must compile, and `circle.radius` must be reachable afterwards. The same assignment using `looksCircular` must error with roughly `Type 'Shape[]' is not assignable to type 'Circle[]'` — pin it with `@ts-expect-error`.

### ⭐⭐ 4. A boundary that counts its rejects (core)

Feature flags arrive as an untrusted blob. Write `interface Flag { name: string; enabled: boolean }`, a guard `isFlag`, and `loadFlags(rawConfig: unknown): { flags: Flag[]; dropped: number }` — if the blob isn't an array, return zero flags; otherwise keep every value that passes the guard and count the ones that don't. Nothing invalid may reach the returned array, and nothing invalid may vanish silently.

**Practices:** the guard as a *partition* at a boundary — a valid side and a counted invalid side, rather than a silent shrug.
**Hint:** `Array.isArray(rawConfig)` narrows `unknown` to `any[]`, which is enough to iterate; each element still has to earn its type from `isFlag`.
**Check:** `rawConfig.filter(isFlag)` written before the `Array.isArray` check must error with roughly `'rawConfig' is of type 'unknown'` — pin it with `@ts-expect-error`. Inside the loop, `flags.push(item)` must compile only in the guarded branch.

### ⭐⭐⭐ 5. One guard per variant, composed with `||` (challenge)

An analytics endpoint accepts three events: `{ type: 'pageview'; path: string }`, `{ type: 'click'; selector: string; at: Point }` where `Point` is `{ x: number; y: number }`, and `{ type: 'purchase'; amountCents: number; items: string[] }`. Instead of one big `switch` guard, write `isPoint` plus one guard per variant, then `isAnalyticsEvent` as `isPageviewEvent(v) || isClickEvent(v) || isPurchaseEvent(v)`. Use it in `describeEvent(incoming: unknown): string` with a real rejection message.

**Practices:** composing guards by `||` into a union guard, and nesting a guard inside a guard to validate an object-valued field.
**Hint:** each small guard is independently useful and independently testable — and `if (isPageviewEvent(v) || isClickEvent(v))` narrows `v` to the union of just those two.
**Check:** must compile with zero casts, and `describeEvent`'s `switch` must need no trailing `return`. Prove the `||` narrowing: `const tag: 'pageview' | 'click' = v.type` inside that combined `if` must compile.

### ⭐⭐⭐ 6. Guard a literal union at the door (challenge)

`type Role = 'admin' | 'editor' | 'viewer'`, and a form hands you a bare `string`. Write `const ROLES: readonly Role[]` and `isRole(value: string): value is Role`, then `parseRole(input: string): Role | null` which trims, lowercases, and returns `null` for anything unrecognised. Then try writing the guard body as `ROLES.includes(value)` and read the error carefully — it's a famous one.

**Practices:** narrowing a wide primitive down to a literal union — the guard shape that guards every enum-like value crossing into your program.
**Hint:** `ROLES.some((role) => role === value)` compiles because `===` merely *compares*; `includes` insists its argument already be a `Role`, which is precisely what you don't know yet.
**Check:** `const direct: Role = someString` must error with roughly `Type 'string' is not assignable to type 'Role'`; pin it with `@ts-expect-error`. Pin the `includes` attempt too — it must error with roughly `Argument of type 'string' is not assignable to parameter of type 'Role'`.

## Solutions

### Solution 1

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function looksLikeString(value: unknown): boolean {
  return typeof value === 'string';
}
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

declare const raw: unknown;
if (looksLikeString(raw)) {
  // @ts-expect-error — a boolean return tells the compiler nothing
  raw.toUpperCase();
}
if (isString(raw)) {
  raw.toUpperCase(); // narrowed
}
```

WHY: both functions run the same test and return the same value; only `isString` publishes its conclusion. `boolean` is a dead end for control-flow analysis — the compiler will not read a function body to guess what a `true` meant — so the type knowledge stays trapped inside. `isNonEmptyString` shows the other half of the deal: a predicate may check *more* than its type says (emptiness isn't in `string`), which is fine, but it must never check less.

### Solution 2

```ts
interface Manifest { name: string; version: string; permissions: string[] }

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isManifest(value: unknown): value is Manifest {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.version === 'string' &&
    isStringArray(value.permissions)
  );
}

function parseManifest(json: string): Manifest {
  const data: unknown = JSON.parse(json);
  if (!isManifest(data)) throw new Error('malformed manifest');
  return data;
}

function parseManifestUnguarded(json: string): Manifest {
  const data: unknown = JSON.parse(json);
  // @ts-expect-error — unknown is not assignable to Manifest without proof
  return data;
}
```

WHY: `Array.isArray` alone would let `permissions: [1, 2, 3]` through, and the type would then promise `string[]` to every consumer downstream — a guard is only as true as its weakest line. Extracting `isStringArray` makes that `every` call the single place the rule lives, so the next guard that needs a string list can't forget it. Note `JSON.parse` returns `any` in the standard library, which is why the explicit `const data: unknown` annotation matters: it re-locks the door that `any` would have left open.

### Solution 3

```ts
interface Circle { radius: number }
interface Rect { width: number; height: number }
interface Segment { length: number }
type Shape = Circle | Rect | Segment;

function isCircle(shape: Shape): shape is Circle {
  return 'radius' in shape;
}
function looksCircular(shape: Shape): boolean {
  return 'radius' in shape;
}

declare const shapes: Shape[];

const circles: Circle[] = shapes.filter(isCircle);
const totalArea: number = circles.reduce((sum, circle) => sum + Math.PI * circle.radius ** 2, 0);

// @ts-expect-error — a plain boolean predicate cannot refine the element type
const looseCircles: Circle[] = shapes.filter(looksCircular);
```

WHY: `filter` is declared twice in the standard library — once taking a plain predicate and returning `T[]`, once taking `(value: T) => value is S` and returning `S[]`. A guard selects the second overload, so the array that comes out is typed by what you proved, and `circle.radius` in the `reduce` needs no further checks. With a `boolean` predicate you get `Shape[]` back and have to narrow all over again inside every consumer — the runtime behaviour is identical, the ergonomics are not.

### Solution 4

```ts
interface Flag { name: string; enabled: boolean }

function isFlag(value: unknown): value is Flag {
  if (!isRecord(value)) return false;
  return typeof value.name === 'string' && typeof value.enabled === 'boolean';
}

function loadFlags(rawConfig: unknown): { flags: Flag[]; dropped: number } {
  if (!Array.isArray(rawConfig)) return { flags: [], dropped: 0 };
  const flags: Flag[] = [];
  let dropped = 0;
  for (const item of rawConfig) {
    if (isFlag(item)) flags.push(item);
    else dropped += 1;
  }
  return { flags, dropped };
}

declare const rawFlags: unknown;
// @ts-expect-error — unknown has no filter method
rawFlags.filter(isFlag);
```

WHY: two guards stack here — `Array.isArray` proves the container, `isFlag` proves each element — and neither can be skipped, because `unknown` has no methods and `any[]` elements have no fields you may trust. Returning `dropped` alongside the flags is the design point: malformed input becomes a number someone can alarm on, rather than a shorter array nobody notices. Compare it to the shape a cast would produce, where `rawConfig as Flag[]` yields a `flags` array full of whatever was in the file.

### Solution 5

```ts
interface Point { x: number; y: number }
interface PageviewEvent { type: 'pageview'; path: string }
interface ClickEvent { type: 'click'; selector: string; at: Point }
interface PurchaseEvent { type: 'purchase'; amountCents: number; items: string[] }
type AnalyticsEvent = PageviewEvent | ClickEvent | PurchaseEvent;

function isPoint(value: unknown): value is Point {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}
function isPageviewEvent(value: unknown): value is PageviewEvent {
  return isRecord(value) && value.type === 'pageview' && typeof value.path === 'string';
}
function isClickEvent(value: unknown): value is ClickEvent {
  return isRecord(value) && value.type === 'click'
    && typeof value.selector === 'string' && isPoint(value.at);
}
function isPurchaseEvent(value: unknown): value is PurchaseEvent {
  return isRecord(value) && value.type === 'purchase'
    && typeof value.amountCents === 'number' && isStringArray(value.items);
}
function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return isPageviewEvent(value) || isClickEvent(value) || isPurchaseEvent(value);
}

function describeEvent(incoming: unknown): string {
  if (!isAnalyticsEvent(incoming)) return 'dropped: not an analytics event';
  switch (incoming.type) {
    case 'pageview': return `viewed ${incoming.path}`;
    case 'click':    return `clicked ${incoming.selector} at ${incoming.at.x},${incoming.at.y}`;
    case 'purchase': return `bought ${incoming.items.length} item(s) for ${incoming.amountCents}c`;
  }
}

declare const maybeEvent: unknown;
if (isPageviewEvent(maybeEvent) || isClickEvent(maybeEvent)) {
  const tag: 'pageview' | 'click' = maybeEvent.type;
  void tag;
}
```

WHY: one guard per variant mirrors one variant per state — each is small enough to read in a glance, and `isClickEvent` alone is useful anywhere you only care about clicks. `||` composes them for free, and TypeScript unions the predicates, so a two-way `||` narrows to a two-variant union rather than collapsing back to `unknown`. `isPoint(value.at)` is the nested case: `value.at` is `unknown` after `isRecord`, and only a guard — not a `typeof` — can vouch for an object shape.

### Solution 6

```ts
type Role = 'admin' | 'editor' | 'viewer';
const ROLES: readonly Role[] = ['admin', 'editor', 'viewer'];

function isRole(value: string): value is Role {
  return ROLES.some((role) => role === value);
}

function parseRole(input: string): Role | null {
  const trimmed = input.trim().toLowerCase();
  return isRole(trimmed) ? trimmed : null;
}

function includesVersion(value: string): boolean {
  // @ts-expect-error — includes wants a Role, and value is only a string
  return ROLES.includes(value);
}

declare const fromForm: string;
// @ts-expect-error — an arbitrary string is not one of the three roles
const direct: Role = fromForm;
```

WHY: `Array<Role>.includes` is declared as `includes(searchElement: Role)`, so it demands you already know the answer to the question you're asking — the classic chicken-and-egg of literal-union guards. `some` sidesteps it because `===` only requires the two operands to be *comparable*, which `Role` and `string` are. The predicate then does the real work: `parseRole` hands back a `Role` the rest of the program can switch on exhaustively, and the one place a raw string could have slipped in is the one place that checks.
