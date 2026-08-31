# 🏋️ Practice: infer & Route Parsing

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a new scratch file, e.g. `typescript/28-infer-routes/scratch.ts` (end it with `export {}` so it's a module), or in a COPY of `refactored/router.ts`. Check your work with `npm run typecheck` from the `typescript/` folder. Don't modify the original files.

## Exercises

### ⭐ 1. Extract the method (warm-up)

Request lines look like `'GET /users'` or `'DELETE /users/:id'` — a method, a space, a path. Write `MethodOf<S>` that extracts the method: `MethodOf<'GET /users'>` is `'GET'`. A string with no space has no method, so it should produce `never`.

*Practices:* one-step template-literal matching with a single `infer`.
*Hint:* one conditional, pattern `` `${infer M} ${string}` ``.
*Check:* `const m: MethodOf<'GET /users'> = 'GET';` must compile; add a `@ts-expect-error` test showing `const x: MethodOf<'health'> = 'health';` errors (nothing is assignable to `never`).

### ⭐⭐ 2. Last segment of a path (core)

Write `LastSegment<S>` that returns the final piece of a slash-separated path: `LastSegment<'/users/7/avatar.png'>` is `'avatar.png'`, and a path with no slashes is its own last segment. This is the smallest possible type-level loop: eat one segment, recurse on the rest.

*Practices:* recursion with `infer` — pattern, capture, recurse, base case.
*Hint:* if `S` matches `` `${string}/${infer Rest}` ``, recurse on `Rest`; otherwise `S` *is* the answer.
*Check:* `const a: LastSegment<'/users/7/avatar.png'> = 'avatar.png';` compiles; `@ts-expect-error` on `const b: LastSegment<'/a/b/c'> = 'b';`.

### ⭐⭐ 3. Split into a tuple (core)

Write `Split<S, Sep>` that splits a string type into a *tuple* of its pieces: `Split<'a/b/c', '/'>` is `['a', 'b', 'c']` and `Split<'2026-08-21', '-'>` is `['2026', '08', '21']`. Unlike exercise 2 you keep every piece, so the recursive case must build a tuple around the recursive call.

*Practices:* accumulating recursion results with tuple spread (`[Head, ...Rest]`).
*Hint:* `` S extends `${infer Head}${Sep}${infer Rest}` ? [Head, ...Split<Rest, Sep>] : [S] ``.
*Check:* `const d: Split<'a/b/c', '/'> = ['a', 'b', 'c'];` compiles; `@ts-expect-error` on assigning a tuple with a wrong length or wrong literal.

### ⭐⭐ 4. Query-string keys (core)

A query template like `'sort&filter&page'` lists the keys a URL needs. Write `QueryKeys<S>` producing the union `'sort' | 'filter' | 'page'`, then `QueryParams<S>` turning that union into `{ sort: string; filter: string; page: string }`. This is `ParamsOf`'s shape with a friendlier separator — a parser producing a union, then a mapped type producing the object.

*Practices:* recursion that produces a *union*, then a mapped type over it (LEARN.md §2.5).
*Hint:* `` S extends `${infer K}&${infer Rest}` ? K | QueryKeys<Rest> : S `` — the base case is the whole remaining string.
*Check:* an object with all three keys compiles; `@ts-expect-error` tests for a missing key and for an extra junk key (excess property checks catch it).

### ⭐⭐⭐ 5. Optional route params (challenge)

Real routers support optional params: in `'/users/:id/:tab?'`, `id` is required but `tab` (note the `?`) is optional. Write `ParamsOf2<Route>` so that `{ id: '7' }` and `{ id: '7', tab: 'posts' }` both check, but `{ tab: 'posts' }` (missing `id`) fails. Approach it in two passes: first collect *all* param names (the `?` stays glued to the name, e.g. `'id' | 'tab?'`), then sort the union into required and optional halves.

*Practices:* multi-pass type design — a name-collecting parser plus distributive conditionals splitting a union.
*Hint:* write `RequiredOf<N> = N extends `${string}?` ? never : N` and `OptionalOf<N> = N extends `${infer Base}?` ? Base : never`, then intersect two mapped types: `{ [K in RequiredOf<Names>]: string } & { [K in OptionalOf<Names>]?: string }`.
*Check:* both good calls compile; `@ts-expect-error` on the missing-`id` object and on a typo'd key like `tabs`.

### ⭐⭐⭐ 6. A fully-typed request line (challenge)

Combine everything: write `RequestOf<S>` where `RequestOf<'GET /users/:userId/posts/:postId'>` is `{ method: 'GET'; params: { userId: string; postId: string } }`. Split off the method first (exercise 1), then feed the remaining path to `ParamsOf` (copy it from `refactored/router.ts` into your scratch file). A route with no params should demand `params: {}` and reject junk.

*Practices:* composing small type-level tools into one pipeline — the way typed API clients are actually built.
*Hint:* `` S extends `${infer M} ${infer Path}` ? { method: M; params: ParamsOf<Path> } : never ``.
*Check:* a correct request object compiles; `@ts-expect-error` tests: wrong method literal (`'PUT'` for a `'GET '` line), and a typo'd param key.

## Solutions

### 1. Extract the method

```ts
type MethodOf<S extends string> = S extends `${infer M} ${string}` ? M : never;

const m1: MethodOf<'GET /users'> = 'GET';
// @ts-expect-error — no space means no method (never accepts nothing)
const m3: MethodOf<'health'> = 'health';
```

**Why:** the pattern `` `${infer M} ${string}` `` means "something, a space, anything" — `infer M` captures the something. TypeScript matches the *first* space for `M`, which is exactly the method/path boundary. `never` for the no-match case makes misuse loud: no value can be assigned to it.

### 2. Last segment of a path

```ts
type LastSegment<S extends string> = S extends `${string}/${infer Rest}`
  ? LastSegment<Rest>
  : S;

const l1: LastSegment<'/users/7/avatar.png'> = 'avatar.png';
```

**Why:** each recursion step throws away everything up to the first `/` and keeps going on `Rest`; when no slash is left, what remains is the last segment — the base case returns `S` itself. This is the "eat through the string" loop from LEARN.md §2.4 in its purest form. For `'/a/b/c'`: `'a/b/c'` → `'b/c'` → `'c'` → done.

### 3. Split into a tuple

```ts
type Split<S extends string, Sep extends string> =
  S extends `${infer Head}${Sep}${infer Rest}`
    ? [Head, ...Split<Rest, Sep>]
    : [S];

const s1: Split<'a/b/c', '/'> = ['a', 'b', 'c'];
const s2: Split<'2026-08-21', '-'> = ['2026', '08', '21'];
```

**Why:** same recursion as exercise 2, but instead of discarding `Head` we keep it: `[Head, ...Split<Rest, Sep>]` builds a tuple whose tail is the recursive result, exactly like `[x, ...rest]` spreads at the value level. The base case `[S]` wraps the final piece so the spread always has a tuple to flatten. `Sep` being a type parameter shows patterns can be assembled from generics, not just written literally.

### 4. Query-string keys

```ts
type QueryKeys<S extends string> =
  S extends `${infer K}&${infer Rest}` ? K | QueryKeys<Rest> : S;
type QueryParams<S extends string> = { [K in QueryKeys<S>]: string };

const q1: QueryParams<'sort&filter&page'> = { sort: 'asc', filter: 'active', page: '2' };
// @ts-expect-error — 'page' is missing
const q2: QueryParams<'sort&page'> = { sort: 'asc' };
// @ts-expect-error — 'limit' is not a declared key
const q3: QueryParams<'sort'> = { sort: 'asc', limit: '10' };
```

**Why:** the parser returns a *union* (`K | QueryKeys<Rest>`) rather than an object, which keeps it tiny; the mapped type does the object-building in one line. This split — parse to a union of names, then map — is often simpler than merging objects inside the recursion, and it's the design exercise 5 builds on.

### 5. Optional route params

```ts
type ParamNames<R extends string> =
  R extends `${string}:${infer P}/${infer Rest}` ? P | ParamNames<`/${Rest}`>
    : R extends `${string}:${infer P}` ? P
    : never;

type RequiredOf<N extends string> = N extends `${string}?` ? never : N;
type OptionalOf<N extends string> = N extends `${infer Base}?` ? Base : never;

type ParamsOf2<R extends string> =
  { [K in RequiredOf<ParamNames<R>>]: string } &
  { [K in OptionalOf<ParamNames<R>>]?: string };

const p1: ParamsOf2<'/users/:id/:tab?'> = { id: '7' };
const p2: ParamsOf2<'/users/:id/:tab?'> = { id: '7', tab: 'posts' };
// @ts-expect-error — required 'id' is missing
const p3: ParamsOf2<'/users/:id/:tab?'> = { tab: 'posts' };
// @ts-expect-error — 'tabs' is a typo
const p4: ParamsOf2<'/users/:id/:tab?'> = { id: '7', tabs: 'posts' };
```

**Why:** `ParamNames` is the refactor's parser reshaped to return a union, with the `?` deliberately left glued onto the captured name (`'id' | 'tab?'`). `RequiredOf` and `OptionalOf` are *distributive* conditionals (exercise 27): applied to a union they filter it, so the marker sorts each name into exactly one of the two mapped types. Intersecting a required-keys object with an optional-keys object gives one type with mixed optionality — something a single mapped type can't express directly.

### 6. A fully-typed request line

```ts
// ParamsOf copied from refactored/router.ts
type RequestOf<S extends string> = S extends `${infer M} ${infer Path}`
  ? { method: M; params: ParamsOf<Path> }
  : never;

const r1: RequestOf<'GET /users/:userId/posts/:postId'> = {
  method: 'GET',
  params: { userId: '7', postId: '42' },
};
// @ts-expect-error — method must be the literal 'GET', not 'PUT'
const r3: RequestOf<'GET /users/:id'> = { method: 'PUT', params: { id: '1' } };
// @ts-expect-error — params are still parsed and checked
const r4: RequestOf<'GET /users/:id'> = { method: 'GET', params: { idd: '1' } };
```

**Why:** one match peels the request line into `M` and `Path`, and each piece flows into the tool that understands it — `M` stays a literal (so `method` must be exactly `'GET'`), and `Path` goes through `ParamsOf` unchanged. Composing small parsers like this is precisely how typed API-client libraries turn a string like `'GET /users/:id'` into a fully checked call signature.

