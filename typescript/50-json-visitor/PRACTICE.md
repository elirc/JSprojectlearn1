# 🏋️ Practice: JSON Visitor

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a COPY of `refactored/json.ts` (it already has `Json`, `JsonVisitor`, `assertNever` and `visit`), or in a scratch `.ts` file inside the `typescript/` folder ending with `export {}`. Run `npm run typecheck` after each step.

## Exercises

### ⭐ 1. Count the leaves (warm-up)

Write `countLeaves: JsonVisitor<number>` — every scalar (`string`, `number`, `boolean`, `null`) counts as one leaf; arrays and objects sum their children. Then prove that a visitor with a missing handler is rejected.

**Practices:** writing a visitor, and feeling the interface enforce completeness.
**Hint:** the recursive arms call `visit(child, countLeaves, ...)` — the visitor refers to itself, which is fine for a `const` used inside arrow functions that run later. `reduce<number>(...)` keeps the accumulator honest.
**Check:** `visit(config, countLeaves)` must infer `number`; a literal missing the `boolean` handler must error with roughly "Property 'boolean' is missing". Note where that error lands — on the **variable declaration**, so the `@ts-expect-error` goes on the `const` line (unlike a *wrong-typed* handler, which errors on the member line).

### ⭐⭐ 2. A recursive type guard (core)

`JSON.parse` returns `any`. Close the boundary: write `isJson(value: unknown): value is Json` that checks a whole document recursively, then `parseJson(text: string): Json` that throws when the check fails.

**Practices:** ts#11's user-defined guards and ts#13's boundary, applied to a recursive type.
**Hint:** mirror `visit`'s structure — `null` first, then a `typeof` switch. Arrays use `value.every(isJson)`; objects use `Object.values(value as Record<string, unknown>).every(isJson)`. The `default` returns `false`, because functions, symbols and `undefined` are exactly what you're keeping out.
**Check:** `parseJson('{"a":[1,null,true]}')` must return `Json` (feed it to `visit` and see it work); `const x: Json = new Date();` must still error. The guard *widens* nothing — its whole job is to turn `unknown` into `Json` honestly.

### ⭐⭐ 3. A transforming visitor (core)

So far visitors have produced summaries. Write `shout: JsonVisitor<Json>` — a visitor whose result type is `Json` itself — that uppercases every string and rebuilds the document unchanged otherwise.

**Practices:** the visitor as a *map* over a recursive structure, not just a fold.
**Hint:** the `object` handler is `Object.fromEntries(Object.keys(value).map((key) => [key, visit(value[key]!, shout, ...)]))`. Because the visitor's `T` is `Json`, the compiler checks that every arm actually produces something JSON-shaped.
**Check:** `const shouted: Json = visit(config, shout);` must compile. Then make one handler return `undefined` and confirm it errors with roughly "Type 'undefined' is not assignable to type 'Json'" — on the **member line**, so put the `@ts-expect-error` inside the literal.

### ⭐⭐ 4. `getIn` — a safe path lookup (core)

Write `getIn(value: Json, path: readonly (string | number)[]): Json | undefined` that walks a document one step at a time, returning `undefined` the moment a step doesn't fit (indexing an object with a number, keying an array with a string, or hitting `null`).

**Practices:** narrowing a recursive union *manually*, in a loop where the compiler tracks each check.
**Hint:** inside the loop, `if (typeof current !== 'object' || Array.isArray(current)) return undefined;` leaves `current` narrowed to the object arm, so `current[step]` is legal without a cast. Handle `current === null` before that, exactly as `visit` does.
**Check:** `getIn(config, ['hooks', 'before'])` and `getIn(config, ['targets', 0])` must compile; `getIn(config, [true])` must error, because a boolean is neither a key nor an index.

### ⭐⭐⭐ 5. Reimplement `JSON.stringify` (challenge)

Write `stringify: JsonVisitor<string>` producing valid JSON text — quoted and escaped strings, `null` for non-finite numbers, `[...]` and `{...}` for the recursive arms.

**Practices:** exhaustiveness where the *cost of a missing case is silent corruption* — a stringifier that skips a variant emits invalid JSON rather than crashing.
**Hint:** you may use `JSON.stringify(value)` for the *scalar string* case (escaping is fiddly and not the point) and for object keys. `Number.isFinite(value) ? String(value) : 'null'` matches the real algorithm's treatment of `NaN` and `Infinity`.
**Check:** `visit(config, stringify)` must compile and produce text `JSON.parse` accepts. Then delete the `null` handler and confirm the compiler stops you — that's the guarantee the original's `walk` never had.

### ⭐⭐⭐ 6. Which types are JSON-safe? (challenge)

Write `type IsJson<T> = T extends Json ? true : false;` and use it to assert three facts. Then write `save<T extends Json>(value: T): string` and prove that a `Date` or a function in the payload is rejected at the call site.

**Practices:** using a recursive type as a *constraint*, so "is this serializable?" is answered before runtime.
**Hint:** the constraint does the work — `save({ when: new Date() })` fails because `{ when: Date }` isn't assignable to `Json`. Watch out for one real-world gotcha: an object type written with `type` is assignable to `{ [key: string]: Json }`, but a value typed by an `interface` is **not** (interfaces get no implicit index signature). That surprise is worth meeting here rather than in production.
**Check:** `const j1: IsJson<{ id: number; tags: string[] }> = true;` must compile, `const j2: IsJson<{ when: Date }> = false;` must compile, and both `save({ when: new Date() })` and `save({ notify: () => {} })` must error.

## Solutions

### 1. Count the leaves

```ts
const countLeaves: JsonVisitor<number> = {
  string: () => 1,
  number: () => 1,
  boolean: () => 1,
  null: () => 1,
  array: (value, path) =>
    value.reduce<number>((n, item, i) => n + visit(item, countLeaves, `${path}[${i}]`), 0),
  object: (value, path) =>
    Object.keys(value).reduce<number>((n, key) => n + visit(value[key]!, countLeaves, `${path}.${key}`), 0),
};
const total = visit(config, countLeaves);
// @ts-expect-error — a visitor missing `boolean` is not a JsonVisitor
const partial: JsonVisitor<number> = {
  string: () => 1, number: () => 1, null: () => 1, array: () => 0, object: () => 0,
};
```

**WHY:** the visitor interface is a *total* contract — six handlers, no optional ones — so "I forgot booleans" is a compile error rather than a wrong count. That's the difference between this design and a hand-written switch with a `default`: here the omission is caught in the consumer, at the exact object literal that's incomplete, with the missing property named. Note the two error *locations* the type tests exercise: a missing property is reported on the declaration, a badly-typed property on the member.

### 2. A recursive type guard

```ts
function isJson(value: unknown): value is Json {
  if (value === null) return true;
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true;
    case 'object':
      if (Array.isArray(value)) return value.every(isJson);
      return Object.values(value as Record<string, unknown>).every(isJson);
    default:
      return false;
  }
}

function parseJson(text: string): Json {
  const raw: unknown = JSON.parse(text);
  if (!isJson(raw)) throw new TypeError('not a JSON value');
  return raw;
}
```

**WHY:** the guard mirrors the *type* — same six arms, same null-first ordering — which is what makes it trustworthy. `parseJson` is the boundary from ts#13 and ts#34: `unknown` in, one check, `Json` out, and everything downstream inherits real knowledge instead of a cast. The `default: return false` arm is the honest half: functions, symbols and `undefined` can reach this function at runtime (a caller can pass anything), and they must be turned away rather than assumed absent.

### 3. A transforming visitor

```ts
const shout: JsonVisitor<Json> = {
  string: (value) => value.toUpperCase(),
  number: (value) => value,
  boolean: (value) => value,
  null: () => null,
  array: (value, path) => value.map((item, i) => visit(item, shout, `${path}[${i}]`)),
  object: (value, path) =>
    Object.fromEntries(Object.keys(value).map((key) => [key, visit(value[key]!, shout, `${path}.${key}`)])),
};
const shouted: Json = visit(config, shout);

const dropper: JsonVisitor<Json> = {
  // @ts-expect-error — a transformer must return Json, not undefined
  string: () => undefined,
  number: (v) => v, boolean: (v) => v,
  null: () => null, array: (v) => [...v], object: (v) => ({ ...v }),
};
```

**WHY:** setting `T = Json` turns the visitor into a document-to-document transformation, and the compiler now checks *both* ends: every arm must accept its variant and produce something JSON-valid. The failing case matters more than the working one — returning `undefined` to "delete" a field is the single most common way JSON transformers produce documents that no longer round-trip, and here it can't compile. Note also that `readonly Json[]` in the `array` handler forces `.map` (a copy) rather than in-place mutation, which is ts#08 quietly doing its job.

### 4. `getIn` — a safe path lookup

```ts
function getIn(value: Json, path: readonly (string | number)[]): Json | undefined {
  let current: Json | undefined = value;
  for (const step of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof step === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[step];
    } else {
      if (typeof current !== 'object' || Array.isArray(current)) return undefined;
      current = current[step];
    }
  }
  return current;
}
const before = getIn(config, ['hooks', 'before']); // Json | undefined
const firstTarget = getIn(config, ['targets', 0]);
// @ts-expect-error — path steps are keys or indices, nothing else
getIn(config, [true]);
```

**WHY:** every `return undefined` corresponds to a real mismatch the original's `any` would have papered over — and each one also *narrows* `current` for the code after it, which is why `current[step]` needs no cast in either branch. The return type `Json | undefined` is the honest signature: a lookup into unknown-shaped data can fail, and saying so forces callers to handle it (ts#05). Compare with a version returning `any`: the caller writes `getIn(doc, path).length` and ships a crash.

### 5. Reimplement `JSON.stringify`

```ts
const stringify: JsonVisitor<string> = {
  string: (value) => JSON.stringify(value),
  number: (value) => (Number.isFinite(value) ? String(value) : 'null'),
  boolean: (value) => String(value),
  null: () => 'null',
  array: (value, path) =>
    `[${value.map((item, i) => visit(item, stringify, `${path}[${i}]`)).join(',')}]`,
  object: (value, path) =>
    `{${Object.keys(value)
      .map((key) => `${JSON.stringify(key)}:${visit(value[key]!, stringify, `${path}.${key}`)}`)
      .join(',')}}`,
};
const text = visit(config, stringify);
```

**WHY:** a stringifier is the worst place for a missing case, because the failure is *silent and downstream*: skip a variant and you emit text that another service fails to parse, hours later, in someone else's logs. The visitor interface makes that class of bug unrepresentable — you cannot construct a `JsonVisitor<string>` that ignores `null`. The `Number.isFinite` line is a small bonus lesson: `NaN` and `Infinity` are legal JavaScript numbers with no JSON representation, so the real `JSON.stringify` emits `null` for them too.

### 6. Which types are JSON-safe?

```ts
type IsJson<T> = T extends Json ? true : false;
const j1: IsJson<{ id: number; tags: string[] }> = true;
const j2: IsJson<{ when: Date }> = false;
const j3: IsJson<() => void> = false;

function save<T extends Json>(value: T): string {
  return visit(value, stringify);
}
const saved = save({ id: 1, tags: ['a'] });
// @ts-expect-error — a Date is not a JSON value
save({ when: new Date() });
// @ts-expect-error — nor is a function
save({ notify: () => {} });
```

**WHY:** `T extends Json` is a *constraint that means something* — "this argument must survive a round trip through text" — checked at every call site instead of discovered when a consumer receives `"2026-01-01T00:00:00.000Z"` where it expected a `Date`, or nothing at all where a method used to be. This is the whole track's thesis in one signature: a runtime property (serializability) expressed as a type, so violating it stops the build. Keep the `interface`-vs-`type` gotcha from the hint in mind — if `save(myConfig)` mysteriously rejects a plainly-JSON object, it's almost certainly because `myConfig`'s type is an `interface`, which never gets an implicit index signature.
