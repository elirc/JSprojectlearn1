# 🏋️ Practice: Type Testing

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch file inside this folder (e.g. `practice.ts`, ending with `export {}`) and run `npm run typecheck` from the `typescript/` folder — that command *is* the test runner. Start every file with `import type { Equal, Expect } from './refactored/type-tests.js';` (or paste the two helpers in yourself).

## Exercises

### ⭐ 1. Pin a union exactly (warm-up)

Given `type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'`, define `type Mutating = Exclude<Method, 'GET'>` and write an assertion tuple that pins it to exactly `'POST' | 'PUT' | 'DELETE'`. Then add a second assertion listing those three members in a *different order* — you are documenting that `Equal` compares union membership, not spelling. Finally assert that `Equal<Mutating, Method>` is `false`.

**Practices:** the basic `type _Cases = [Expect<Equal<...>>, ...]` rhythm, and reading `Equal` as a value you can assert *about*.
**Hint:** `Expect<Equal<Equal<A, B>, false>>` is how you assert a negative without `@ts-expect-error`.
**Check:** the tuple must compile; `type _Wrong = Expect<Equal<Mutating, Method>>` must fail, so put a `@ts-expect-error` above it and confirm the directive is *used* (an unused one is itself an error).

### ⭐⭐ 2. Test a key-remapped mapped type (core)

A form library derives change handlers from state: field `name: string` should yield `onNameChange: (value: string) => void`. Write `Handlers<T>` using a `as` key-remapping clause with `Capitalize`, then pin the whole output object for `{ name: string; age: number; subscribed: boolean }` with one `Equal`. Add a second assertion on just `keyof Handlers<FormState>`.

**Practices:** asserting the exact shape of a generated type — the kind of thing a tooltip truncates.
**Hint:** `[K in keyof T as \`on${Capitalize<K & string>}Change\`]` — the `K & string` is needed because `keyof T` may include symbols.
**Check:** both assertions must compile. Add a `@ts-expect-error` on an assertion claiming the key is `'onnameChange'`, proving `Capitalize` really ran.

### ⭐⭐ 3. Catch a distributivity bug with a test (core)

A colleague wrote `type Boxed<T> = T extends unknown ? T[] : never`, meaning "an array of T". It is wrong for unions: a naked type parameter distributes, so `Boxed<string | number>` becomes `string[] | number[]` — "either an array of strings or an array of numbers" — not `(string | number)[]`, which is a mixed array. Write the test that exposes it, fix the type, and keep both versions so you can assert what each one produces.

**Practices:** using `Equal` to catch a difference plain `extends` waves through, and pinning a fixed bug so it stays fixed.
**Hint:** wrapping both sides in a one-element tuple, `[T] extends [unknown]`, switches distribution off.
**Check:** assert the fixed version equals `(string | number)[]`, assert the buggy version equals `string[] | number[]`, and assert `Equal<string[] | number[], (string | number)[]>` is `false`. Add a `@ts-expect-error` on the claim that the buggy version equals `(string | number)[]`.

### ⭐⭐ 4. Test inference, not just aliases (core)

Real type tests usually check what the compiler *infers* at a call site. Given `declare function project<T, K extends keyof T>(row: T, keys: readonly K[]): Pick<T, K>` and an `Account` interface with `id`, `email`, `createdAt`, `archived`, call it with `['id', 'email']` and assert the inferred type of the result — twice, once against a hand-written object type and once against `Pick<Account, 'id' | 'email'>`.

**Practices:** `typeof someValue` as the left side of an `Equal`, joining value-level inference to type-level assertions.
**Hint:** `Expect<Equal<typeof summary, { id: number; email: string }>>`.
**Check:** both assertions must compile. Add `@ts-expect-error` tests for `project(account, ['emial'])` and for reading `summary.createdAt`, which the projection dropped.

### ⭐⭐⭐ 5. Pin a recursive parser (challenge)

Write `ParamNames<S extends string>` extracting route parameters from a path — `'/users/:id/posts/:postId'` should give the union `'id' | 'postId'` — then `PathParams<S> = { [K in ParamNames<S>]: string }`. Split on `/` and recurse over both halves rather than trying to match `:` and `/` in one pattern; the two-wildcard version is both harder to reason about and much slower to check. Pin all four claims: the union, the object, the no-parameter union, and the no-parameter object.

**Practices:** asserting the exact output of a recursive `infer` type, including the `never` and `{}` edge cases a hover cannot show you.
**Hint:** `S extends \`${infer Head}/${infer Rest}\` ? ParamNames<Head> | ParamNames<Rest> : S extends \`:${infer Name}\` ? Name : never`.
**Check:** all four must compile, including `Equal<ParamNames<'/health'>, never>` and `Equal<PathParams<'/health'>, {}>`. Add a `@ts-expect-error` on a near-miss claiming the union is `'id' | 'post'`.

### ⭐⭐⭐ 6. Test the tester (challenge)

Why the strange two-function idiom? Write the obvious alternative, `NaiveEqual<A, B> = A extends B ? (B extends A ? true : false) : false`, and then write assertions documenting exactly where it diverges from `Equal`. Two divergences are worth pinning: `readonly` modifiers, which assignability ignores in both directions, and `any`, which distributes into *both* branches of a conditional.

**Practices:** treating your test helper as code under test — the last thing standing between you and a suite that silently passes.
**Hint:** compare `Frozen` (all properties `readonly`) with `Thawed` (the same properties, mutable); for `any`, assert what `NaiveEqual<any, string>` collapses to rather than assuming it is `true` or `false`.
**Check:** assert `NaiveEqual<Frozen, Thawed>` is `true` while `Equal<Frozen, Thawed>` is `false`; assert `NaiveEqual<any, string>` is `boolean` while `Equal<any, string>` is `false`. Add a `@ts-expect-error` on the claim that `NaiveEqual<Frozen, Thawed>` is `false`.

## Solutions

### Solution 1

```ts
import type { Equal, Expect } from './refactored/type-tests.js';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Mutating = Exclude<Method, 'GET'>;

type _MethodCases = [
  Expect<Equal<Mutating, 'POST' | 'PUT' | 'DELETE'>>,
  Expect<Equal<Mutating, 'PUT' | 'DELETE' | 'POST'>>, // order is not identity
  Expect<Equal<Equal<Mutating, Method>, false>>,
];

// @ts-expect-error — 'GET' was excluded, so this claim is false
type _MethodWrong = Expect<Equal<Mutating, Method>>;
```

WHY: the tuple is the suite — each entry is a claim the compiler re-checks on every build, and a failure names the exact line rather than a downstream mystery. The second entry pins something a hover could never settle: unions have no order, so a refactor that reshuffles members is not a regression. The third shows the two ways to write a negative — `Expect<Equal<X, false>>` keeps the claim inside the tuple, while `@ts-expect-error` guards a line that must not compile at all.

### Solution 2

```ts
interface FormState { name: string; age: number; subscribed: boolean }

type Handlers<T> = {
  [K in keyof T as `on${Capitalize<K & string>}Change`]: (value: T[K]) => void;
};

type _HandlerCases = [
  Expect<Equal<Handlers<FormState>, {
    onNameChange: (value: string) => void;
    onAgeChange: (value: number) => void;
    onSubscribedChange: (value: boolean) => void;
  }>>,
  Expect<Equal<keyof Handlers<FormState>, 'onNameChange' | 'onAgeChange' | 'onSubscribedChange'>>,
];

// @ts-expect-error — Capitalize ran, so the key is 'onNameChange'
type _Miscased = Expect<Equal<keyof Handlers<{ name: string }>, 'onnameChange'>>;
```

WHY: a key-remapped mapped type is generated code, and generated code is where "it looked right in the tooltip" fails hardest — three fields already produce a type most editors truncate. Pinning the entire object once proves the names, the parameter types, and the key-to-value correlation together; the extra `keyof` assertion isolates just the naming rule, so a broken `Capitalize` reports as a naming failure rather than a wall of mismatched properties.

### Solution 3

```ts
type BoxedNaive<T> = T extends unknown ? T[] : never; // distributes — the bug
type Boxed<T> = [T] extends [unknown] ? T[] : never;  // fixed

type _BoxedCases = [
  Expect<Equal<Boxed<string | number>, (string | number)[]>>,
  Expect<Equal<BoxedNaive<string | number>, string[] | number[]>>,
  Expect<Equal<Equal<string[] | number[], (string | number)[]>, false>>,
  Expect<Equal<Boxed<string>, string[]>>,
];

// @ts-expect-error — the distributive version splits the union apart
type _BoxedBug = Expect<Equal<BoxedNaive<string | number>, (string | number)[]>>;
```

WHY: this is the array-holes bug in a different costume — a type that is right for the case its author tested (`Boxed<string>` is fine either way) and wrong for the case they did not. The third assertion is the one that makes the suite trustworthy: it states outright that the two candidate answers are genuinely different types, so nobody can later "fix" a failing test by swapping in the near-miss. Tuple-wrapping is the standard off switch for distribution, and both sides must be wrapped for the comparison to stay meaningful.

### Solution 4

```ts
interface Account { id: number; email: string; createdAt: Date; archived: boolean }

declare function project<T, K extends keyof T>(row: T, keys: readonly K[]): Pick<T, K>;

declare const account: Account;
const summary = project(account, ['id', 'email']);

type _ProjectCases = [
  Expect<Equal<typeof summary, { id: number; email: string }>>,
  Expect<Equal<typeof summary, Pick<Account, 'id' | 'email'>>>,
];

// @ts-expect-error — 'emial' is not a key of Account
project(account, ['emial']);

// @ts-expect-error — the projection dropped createdAt
export const when: Date = summary.createdAt;
```

WHY: most type bugs users actually hit are inference bugs — the signature is fine in isolation but `K` widens to `string`, or the return type quietly becomes `Account`, and nothing complains until a call site far away. `typeof summary` reaches into the value world and drags the inferred type back for assertion, so the suite tests the function as callers experience it. The two assertions are deliberately redundant: one fails readably when a property type drifts, the other when the `Pick` machinery itself changes.

### Solution 5

```ts
type ParamNames<S extends string> = S extends `${infer Head}/${infer Rest}`
  ? ParamNames<Head> | ParamNames<Rest>
  : S extends `:${infer Name}`
    ? Name
    : never;

type PathParams<S extends string> = { [K in ParamNames<S>]: string };

type _PathCases = [
  Expect<Equal<ParamNames<'/users/:id/posts/:postId'>, 'id' | 'postId'>>,
  Expect<Equal<PathParams<'/users/:id/posts/:postId'>, { id: string; postId: string }>>,
  Expect<Equal<ParamNames<'/health'>, never>>,
  Expect<Equal<PathParams<'/health'>, {}>>,
];

// @ts-expect-error — the last segment contributes 'postId', not 'post'
type _PathMissed = Expect<Equal<ParamNames<'/users/:id/posts/:postId'>, 'id' | 'post'>>;
```

WHY: splitting on a single separator and recursing over both halves keeps each step unambiguous, so the type is easy to read *and* cheap to check — a pattern with two wildcards around `:` and `/` forces the checker to try many split points for the same answer. The `never` and `{}` cases are the whole reason to write these tests: a union absorbs `never` silently, so a hover of `ParamNames<'/health'>` tells you nothing, while `Expect<Equal<..., never>>` states it flatly. The near-miss under `@ts-expect-error` guards against a future edit that truncates the last segment.

### Solution 6

```ts
type NaiveEqual<A, B> = A extends B ? (B extends A ? true : false) : false;

interface Frozen { readonly id: number; readonly name: string }
interface Thawed { id: number; name: string }

type _NaiveCases = [
  Expect<Equal<NaiveEqual<Frozen, Thawed>, true>>,  // naive: "equal"
  Expect<Equal<Equal<Frozen, Thawed>, false>>,      // Equal: readonly counts
  Expect<Equal<NaiveEqual<any, string>, boolean>>,  // any takes both branches
  Expect<Equal<Equal<any, string>, false>>,
];

// @ts-expect-error — NaiveEqual is blind to readonly, so it never returns false here
type _NaiveBlind = Expect<Equal<NaiveEqual<Frozen, Thawed>, false>>;
```

WHY: assignability deliberately ignores `readonly`, so bidirectional `extends` reports two genuinely different types as equal — a suite built on `NaiveEqual` would happily pass while a mutation bug walked through. The `any` case is worse: `any` on the left of a conditional yields *both* branches, so `NaiveEqual<any, string>` is `boolean`, which `Expect` rejects with a confusing message rather than an honest `false`. `Equal` sidesteps both by asking whether two deferred conditional types are identical, which is a much stricter question — and asserting these divergences is what turns "memorize this idiom" into knowing what it buys.
