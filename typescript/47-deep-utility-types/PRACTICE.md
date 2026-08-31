# 🏋️ Practice: Deep Utility Types

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a COPY of `refactored/deep.ts` (so `Primitive`, `AnyFunction`, `Atomic`, `DeepPartial`, `DeepReadonly`, `Config`, `Equal` and `Expect` are already there), or in a scratch `.ts` file inside the `typescript/` folder ending in `export {}`. Then run `npm run typecheck` from the repo root.

## Exercises

### ⭐ 1. `DeepRequired<T>` — the inverse of `DeepPartial` (warm-up)

Write the utility that strips `?` all the way down, reusing the same leaf list and the same three-branch shape.

**Practices:** the `-?` modifier, and the fact that a correct recursive utility is a *template* you can re-point at a different modifier.
**Hint:** identical to `DeepPartial` except the last branch uses `-?` instead of `?`. Leave the array branch alone — arrays never got a `?` in the first place.
**Check:** `Expect<Equal<DeepRequired<{ a?: { b?: number } }>, { a: { b: number } }>>` compiles. The satisfying one: `Expect<Equal<DeepRequired<DeepPartial<Config>>, Config>>` also compiles — a perfect round trip, which is only true because both utilities stop at the same leaves. (Try it with `DeepPartialBad` from `original.ts` in the middle and watch it fail.)

### ⭐⭐ 2. `DeepMutable<T>` — undo `DeepReadonly` (core)

Write the utility that removes `readonly` at every level, then prove it round-trips.

**Practices:** the `-readonly` modifier; noticing that this one needs only *two* branches, for the same reason `DeepReadonly` does.
**Hint:** `{ -readonly [K in keyof T]: DeepMutable<T[K]> }` — and homomorphic mapping turns `readonly string[]` back into `string[]` and `readonly [number, number]` back into `[number, number]` on its own.
**Check:** `Expect<Equal<DeepMutable<DeepReadonly<Config>>, Config>>` compiles; and at the value level, declare one and confirm `mutable.server.port = 2` and `mutable.tags.push('b')` both compile — the second is the array proof, since a `readonly string[]` has no `push`.

### ⭐⭐ 3. Teach it about `Map` and `Set` (core)

LEARN section 6 admits the gap: `Map` isn't in `Atomic`, so `DeepPartial` recurses into its methods and produces flaw-4 garbage. Adding `Map` to `Atomic` fixes the garbage but stops recursion entirely. Do it properly — recurse into the *values*.

**Practices:** `infer` inside a leaf-detection chain; the difference between "atomic" and "a container with its own recursion rule".
**Hint:** add two branches *before* the array branch: `T extends Map<infer K, infer V> ? Map<K, DeepPartial<V>> : T extends Set<infer E> ? Set<DeepPartial<E>> : ...`. Keys stay untouched — a partial key would be a different key.
**Check:** `Expect<Equal<DeepPartial<Registry>['byId'], Map<string, { id?: number; name?: string }> | undefined>>` compiles for `interface Registry { byId: Map<string, { id: number; name: string }>; seen: Set<string>; label: string }`; `Sets` of primitives come through unchanged; and `{ byId: {} }` must error ("Type '{}' is missing the following properties from type 'Map<…>'").

### ⭐⭐⭐ 4. `Paths<T>` — every dotted key path in a type (challenge)

Produce the union of every path into a type: `'server' | 'server.port' | 'server.host' | 'tags' | 'debug' | ...`. Atomic leaves (a `Date`, a function) contribute their own key and nothing below it.

**Practices:** recursion that builds *string* types (ts#26/#44) driven by the same leaf list.
**Hint:**
`type Paths<T> = T extends Atomic ? never : T extends readonly unknown[] ? never : { [K in keyof T & string]: K | `${K}.${Paths<T[K]> & string}` }[keyof T & string];`
Two details make it work: `keyof T & string` drops symbol keys (which can't go in a template literal), and a template literal containing `never` *is* `never` — so leaves contribute `K` alone, with no dangling `'K.'`.
**Check:** `const ok: Paths<Config> = 'server.port';` compiles; `'server.prot'` errors; `'createdAt.getTime'` errors (a `Date` is atomic, so it has no sub-paths — this is the assertion that proves the leaf list is doing the work).

### ⭐⭐⭐ 5. `GetByPath<T, P>` — resolve a path back to its type (challenge)

Now the other direction: given `Config` and `'server.port'`, produce `number`. Then combine both into `get(source, path)`, a fully typed deep accessor.

**Practices:** recursive template-literal *parsing* (ts#28's move) with an indexed access at each step.
**Hint:** split on the first `.`, check `Head extends keyof T`, recurse into `T[Head]` with the rest; with no dot left, it's `P extends keyof T ? T[P] : never`. The accessor signature is `function get<T, P extends Paths<T> & string>(source: T, path: P): GetByPath<T, P>`.
**Check:** `GetByPath<Config, 'server.port'>` is `number`, `GetByPath<Config, 'tags'>` is `string[]`, `GetByPath<Config, 'server.nope'>` is `never`; and `get(config, 'server.port')` has type `number` while `get(config, 'server.prot')` errors — the two types together give you a compile-checked `lodash.get`.

## Solutions

### 1. `DeepRequired<T>`

```ts
type DeepRequired<T> = T extends Atomic
  ? T
  : T extends readonly unknown[]
    ? { [K in keyof T]: DeepRequired<T[K]> }
    : { [K in keyof T]-?: DeepRequired<T[K]> };

type _r1 = Expect<Equal<DeepRequired<{ a?: { b?: number } }>, { a: { b: number } }>>;
type _r2 = Expect<Equal<DeepRequired<DeepPartial<Config>>, Config>>;
type _r3 = Expect<Equal<DeepRequired<{ at?: Date }>, { at: Date }>>;
```

**WHY:** once the *shape* is right, the modifier is a detail — which is the real lesson of this exercise. `-?` removes optionality (and the `undefined` that `?` adds), and everything else is unchanged, because the hard part was never the modifier: it was deciding where to stop. The round-trip test is the one to keep. `DeepRequired<DeepPartial<Config>>` equals `Config` exactly, including `tags: string[]`, `point: [number, number]`, `onSave` and `createdAt` — and it can only be exact because both utilities treat the same things as leaves. Run the same round trip through `DeepPartialBad` and it fails, because the sparse array can't be un-sparsed.

### 2. `DeepMutable<T>`

```ts
type DeepMutable<T> = T extends Atomic ? T : { -readonly [K in keyof T]: DeepMutable<T[K]> };

type _m1 = Expect<Equal<DeepMutable<DeepReadonly<Config>>, Config>>;
type _m2 = Expect<Equal<DeepMutable<{ readonly a: readonly string[] }>, { a: string[] }>>;

const mutable: DeepMutable<DeepReadonly<Config>> = {
  server: { port: 1, host: 'h' }, tags: ['a'], users: [{ id: 1, name: 'Ada' }],
  point: [0, 0], onSave: () => {}, createdAt: new Date(0), debug: false,
};
mutable.server.port = 2;
mutable.tags.push('b'); // the array proof: readonly string[] has no push
```

**WHY:** two branches, for the same reason `DeepReadonly` has two: `readonly` (and its removal) means the identical thing for objects, arrays and tuples, so homomorphic mapping handles all three without a special case. Contrast `DeepPartial`, where `?` means something *different* for an array ("elements may be missing") than for an object ("fields may be missing") — that mismatch is the entire bug this project is about. When a modifier's meaning is uniform, the type gets shorter; when it isn't, you need the extra branch. The `push` line is worth writing out: it's a value-level test that catches a mistake `Equal` alone might let through if you mistyped the modifier.

### 3. `Map` and `Set`

```ts
type DeepPartial<T> = T extends Atomic
  ? T
  : T extends Map<infer K, infer V>
    ? Map<K, DeepPartial<V>>
    : T extends Set<infer E>
      ? Set<DeepPartial<E>>
      : T extends readonly unknown[]
        ? { [K in keyof T]: DeepPartial<T[K]> }
        : { [K in keyof T]?: DeepPartial<T[K]> };

interface Registry {
  byId: Map<string, { id: number; name: string }>;
  seen: Set<string>;
  label: string;
}
type _k1 = Expect<Equal<DeepPartial<Registry>['byId'], Map<string, { id?: number; name?: string }> | undefined>>;
type _k2 = Expect<Equal<DeepPartial<Registry>['seen'], Set<string> | undefined>>;
// @ts-expect-error — a Map is still a Map, not a bag of optional methods
const notAMap: DeepPartial<Registry> = { byId: {} };
```

**WHY:** there are three categories, not two. *Atomic* things are copied whole (`Date`, functions). *Plain objects* get mapped. And **containers** — arrays, `Map`, `Set`, `Promise` — need a rule of their own: keep the container, recurse into what it holds. Dropping `Map` into `Atomic` would have been the lazy fix and would silently stop `{ byId: new Map([['a', { id: 1 }]]) }` from being partial at all. Note the key stays `K`: a half-built key isn't a key, it's a different entry. Branch order matters here for real — `Map` must be tested before the array branch only in the sense that both must precede the plain-object fallback, since `Map` is not array-shaped but *is* an object.

### 4. `Paths<T>`

```ts
type Paths<T> = T extends Atomic
  ? never
  : T extends readonly unknown[]
    ? never
    : { [K in keyof T & string]: K | `${K}.${Paths<T[K]> & string}` }[keyof T & string];

const ok: Paths<Config> = 'server.port';
// @ts-expect-error — 'server.prot' is not a path of Config
const typo: Paths<Config> = 'server.prot';
// @ts-expect-error — Date is atomic: it has no sub-paths
const tooDeep: Paths<Config> = 'createdAt.getTime';
```

**WHY:** the same leaf list, now controlling how deep a *string* recursion goes — which is why `'createdAt.getTime'` is rejected. Without `Atomic` in the first branch you'd get `'createdAt.getTime' | 'createdAt.toISOString' | …`, technically true and completely useless. Two mechanics carry the implementation. `keyof T & string` filters out numeric and symbol keys, which can't be spliced into a template literal. And the reason leaves don't produce a dangling `'debug.'` is that a template literal type containing `never` collapses to `never`: `` `debug.${never}` `` is `never`, and `never` vanishes from the union, leaving `'debug'` alone. Indexing the mapped type with `[keyof T & string]` then flattens the whole thing into one union, exactly as in ts#44's practice 1.

### 5. `GetByPath<T, P>`

```ts
type GetByPath<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? GetByPath<T[Head], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

type _g1 = Expect<Equal<GetByPath<Config, 'server.port'>, number>>;
type _g2 = Expect<Equal<GetByPath<Config, 'tags'>, string[]>>;
type _g3 = Expect<Equal<GetByPath<Config, 'server.nope'>, never>>;

declare function get<T, P extends Paths<T> & string>(source: T, path: P): GetByPath<T, P>;
declare const config: Config;
const port = get(config, 'server.port'); // number
// @ts-expect-error — the typo is rejected by the path type
get(config, 'server.prot');
```

**WHY:** `Paths` and `GetByPath` are inverses, and together they turn the most notorious untyped helper in JavaScript — `lodash.get(obj, 'a.b.c')` — into a compile-checked operation. `Paths<T>` constrains the *argument* so typos are rejected before anything runs; `GetByPath<T, P>` computes the *result* so the caller gets `number` instead of `any`. The recursion is ts#28's parser move once more: split at the first separator, resolve the head with an indexed access, recurse on the tail, and bottom out on the no-separator case. The `never` fallbacks matter too — they're what makes an unreachable path produce an honest "there is nothing here" instead of a plausible lie.
