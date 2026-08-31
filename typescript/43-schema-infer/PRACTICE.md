# 🏋️ Practice: Schema Infer

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a COPY of `refactored/schema.ts` (so `Validator`, `Infer` and `s` are already there), or in a scratch `.ts` file inside the `typescript/` folder ending in `export {}`. Then run `npm run typecheck` from the repo root.

## Exercises

### ⭐ 1. `s.literal()` — a validator for one exact value (warm-up)

Add a builder `literal(expected)` that accepts a single string, number or boolean and returns a validator for *that literal type*, not the widened primitive. `literal('admin')` must produce a `Validator<'admin'>`, so `Infer<typeof roleSchema>` is `'admin'` and nothing else fits.

**Practices:** generic capture of a literal (ts#31) inside the validator pattern.
**Hint:** `function literal<T extends string | number | boolean>(expected: T): Validator<T>`. The constraint is what keeps `'admin'` from widening to `string`; the body compares with `!==` and returns `expected`.
**Check:** `const role: Infer<typeof roleSchema> = 'guest';` must error with roughly "'guest' is not assignable to type 'admin'". Add it as a `@ts-expect-error` test. If instead it compiles, your `T` widened — check the constraint.

### ⭐⭐ 2. `s.union()` — two validators, one type (core)

Write `union(a, b)` that tries `a.parse` and falls back to `b.parse`, typed so `union(s.string(), s.number())` infers `string | number`.

**Practices:** two type parameters flowing into a union return type.
**Hint:** `function union<A, B>(a: Validator<A>, b: Validator<B>): Validator<A | B>` — the runtime body is a `try`/`catch`, and the *type* is the whole exercise.
**Check:** `Expect<Equal<Infer<typeof idSchema>, string | number>>` must compile, and calling `.toFixed(2)` on a parsed value must error ("Property 'toFixed' does not exist on type 'string | number'") — a union you haven't narrowed yet, exactly as ts#09 taught.

### ⭐⭐ 3. `safeParse()` — validation as a value, not an exception (core)

`parse()` throws. Write `safeParse(validator, value)` that returns ts#36's `Result` instead: `{ ok: true; value: T } | { ok: false; error: string }`, where `T` is the validator's inferred output.

**Practices:** using `Infer<V>` in a function signature — the derived type doing work away from the schema.
**Hint:** the signature is `function safeParse<V extends Validator<unknown>>(validator: V, value: unknown): Result<Infer<V>>`. Catch `unknown` (ts#35) and narrow with `error instanceof Error` before reading `.message`.
**Check:** reading `outcome.value` before checking `outcome.ok` must error ("Property 'value' does not exist on type ..."), and inside `if (outcome.ok)` the value must be fully typed — `outcome.value.name.toUpperCase()` compiles.

### ⭐⭐⭐ 4. `s.tuple()` — inferring a fixed-length shape (challenge)

Write `tuple([...])` so that `tuple([s.number(), s.number()])` infers `[number, number]` — a real tuple, not `number[]`, and not `(string | number)[]` when the members differ.

**Practices:** tuple inference, and the constraint trick that turns it on.
**Hint:** the obvious `<S extends readonly Validator<unknown>[]>` gives you `Validator<string | number>[]` — an *array*, because array-literal arguments widen. Write the constraint as `readonly [] | readonly Validator<unknown>[]` to force positional (tuple) inference, then map with `{ -readonly [K in keyof S]: Infer<S[K]> }`; homomorphic mapping keeps the tuple-ness and `-readonly` hands back a mutable one.
**Check:** `Expect<Equal<Infer<typeof pointSchema>, [number, number]>>` must compile, `Expect<Equal<Infer<typeof pairSchema>, [string, number]>>` must compile (positions stay distinct!), and `const p: Point = [1, 2, 3];` must error about length.

### ⭐⭐⭐ 5. `s.optional()` — keys that are actually optional (challenge)

`optional(s.string())` should make a key *optional* in the inferred type — `{ name: string; nickname?: string }` — not merely `string | undefined` on a required key. That means `s.object()` has to sort its keys into two groups before mapping them.

**Practices:** key filtering with a mapped type + indexed access, then an intersection of two mapped types.
**Hint:** mark optional validators at the type level (`interface OptionalValidator<T> extends Validator<T | undefined> { readonly optional: true }`), then:
`type OptionalKeys<S> = { [K in keyof S]: S[K] extends { optional: true } ? K : never }[keyof S];`
`type RequiredKeys<S> = Exclude<keyof S, OptionalKeys<S>>;`
and build `{ [K in RequiredKeys<S>]: Infer<S[K]> } & { [K in OptionalKeys<S>]?: Exclude<Infer<S[K]>, undefined> }`.
**Check:** `const p: Profile = { name: 'Ada' };` must compile (the key really is omittable), `{ nickname: 'x' }` alone must error (`name` is still required), and `{ name: 'Ada', nickname: 42 }` must error — optional means "may be absent", never "may be anything".

## Solutions

### 1. `s.literal()`

```ts
function literal<T extends string | number | boolean>(expected: T): Validator<T> {
  return {
    kind: `literal(${String(expected)})`,
    parse: (value, path) => {
      if (value !== expected) throw new TypeError(`${path}: expected ${String(expected)}`);
      return expected;
    },
  };
}
const roleSchema = literal('admin');
type Role = Infer<typeof roleSchema>; // 'admin'
// @ts-expect-error — the literal type is narrower than string
const notARole: Role = 'guest';
```

**WHY:** `T extends string | number | boolean` is a constraint, not an annotation, so the argument's *literal* type is captured — `'admin'`, not `string` (ts#31's widening lesson, and the reason `literal(x: string)` would ruin it). The runtime check is a single `!==`; the value of the exercise is entirely in the signature. Note that `parse` returns `expected`, not `value`: after the comparison they're equal, and returning `expected` is the one that already has type `T`.

### 2. `s.union()`

```ts
function union<A, B>(a: Validator<A>, b: Validator<B>): Validator<A | B> {
  return {
    kind: `${a.kind}|${b.kind}`,
    parse: (value, path) => {
      try {
        return a.parse(value, path);
      } catch {
        return b.parse(value, path);
      }
    },
  };
}
const idSchema = union(s.string(), s.number());
type _u1 = Expect<Equal<Infer<typeof idSchema>, string | number>>;
const idValue = idSchema.parse(7, '$');
// @ts-expect-error — a union member must be narrowed before use
idValue.toFixed(2);
```

**WHY:** `A` and `B` are inferred independently from the two arguments and combined in the return type — the type-level version of "try this, else that." The last test is the important one: the schema now produces an *honest* union, so the compiler makes you narrow it (`typeof idValue === 'number'`) exactly like ts#09. A validator that returned `any` would have let `.toFixed` through on a string.

### 3. `safeParse()`

```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function safeParse<V extends Validator<unknown>>(validator: V, value: unknown): Result<Infer<V>> {
  try {
    return { ok: true, value: validator.parse(value, '$') as Infer<V> };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
const outcome = safeParse(userSchema, { name: 'Ada', age: 36 });
// @ts-expect-error — can't read .value before checking .ok
outcome.value;
if (outcome.ok) outcome.value.name.toUpperCase(); // narrowed, fully typed
```

**WHY:** `Infer<V>` turns the schema into a type in a completely different part of the program — that's the payoff of deriving instead of duplicating. The `as Infer<V>` is needed because `V extends Validator<unknown>` only promises `unknown` from `parse`; the cast re-applies what `Infer` already knows, and it's contained in one library function. The `catch (error: unknown)` plus `instanceof` narrowing is ts#35's rule: caught values are `unknown`, always.

### 4. `s.tuple()`

```ts
function tuple<S extends readonly [] | readonly Validator<unknown>[]>(
  items: S,
): Validator<{ -readonly [K in keyof S]: Infer<S[K]> }> {
  return {
    kind: 'tuple',
    parse: (value, path) => {
      if (!Array.isArray(value) || value.length !== items.length) {
        throw new TypeError(`${path}: expected a tuple of ${items.length}`);
      }
      return items.map((item, i) => item.parse(value[i], `${path}[${i}]`)) as {
        -readonly [K in keyof S]: Infer<S[K]>;
      };
    },
  };
}
const pointSchema = tuple([s.number(), s.number()]);
const pairSchema = tuple([s.string(), s.number()]);
type _t1 = Expect<Equal<Infer<typeof pointSchema>, [number, number]>>;
type _t2 = Expect<Equal<Infer<typeof pairSchema>, [string, number]>>;
// @ts-expect-error — a tuple has a fixed length
const wrongLength: Infer<typeof pointSchema> = [1, 2, 3];
```

**WHY:** the two-branch constraint is the whole trick. With a plain `readonly Validator<unknown>[]` constraint the compiler infers an *array* type and unions the element types (`Validator<string | number>[]`), destroying position information. Adding `readonly []` to the constraint tells it a tuple is expected, so it infers positionally. (Modern TypeScript offers `<const S extends readonly Validator<unknown>[]>` for the same effect — either is fine.) After that, the homomorphic mapped type does what it did in ts#25: preserves tuple-ness, maps each slot, and `-readonly` strips the modifier the constraint introduced.

### 5. `s.optional()`

```ts
interface OptionalValidator<T> extends Validator<T | undefined> {
  readonly optional: true;
}
function optional<T>(inner: Validator<T>): OptionalValidator<T> {
  return {
    kind: `${inner.kind}?`,
    optional: true,
    parse: (value, path) => (value === undefined ? undefined : inner.parse(value, path)),
  };
}

type OptionalKeys<S> = { [K in keyof S]: S[K] extends { optional: true } ? K : never }[keyof S];
type RequiredKeys<S> = Exclude<keyof S, OptionalKeys<S>>;
type ShapeOf<S> = { [K in RequiredKeys<S>]: Infer<S[K]> } & {
  [K in OptionalKeys<S>]?: Exclude<Infer<S[K]>, undefined>;
};

function object2<S extends Record<string, Validator<unknown>>>(shape: S): Validator<ShapeOf<S>> {
  return {
    kind: 'object',
    parse: (value, path) => {
      const record = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) out[key] = shape[key]!.parse(record[key], `${path}.${key}`);
      return out as ShapeOf<S>;
    },
  };
}

const profileSchema = object2({ name: s.string(), nickname: optional(s.string()) });
type Profile = Infer<typeof profileSchema>;
const p1: Profile = { name: 'Ada' };                     // ✅ omittable
const p2: Profile = { name: 'Ada', nickname: 'Countess' }; // ✅
// @ts-expect-error — a required key is still required
const p3: Profile = { nickname: 'x' };
// @ts-expect-error — optional doesn't mean any type
const p4: Profile = { name: 'Ada', nickname: 42 };
```

**WHY:** `OptionalKeys` is the standard "filter keys by a condition" idiom — map every key to *itself or `never`*, then index with `[keyof S]` to collect the survivors into a union (`never` vanishes from unions, which is exactly the filtering). The `optional: true` marker is a phantom in the same spirit as ts#29's brand: a tiny type-level flag whose only job is to be readable by a conditional type. Splitting the keys into two mapped types and intersecting them is how you apply the `?` modifier to *some* keys — a single mapped type can only apply it to all of them. The `Exclude<..., undefined>` keeps the value type clean, since `?` already contributes the `undefined`.
