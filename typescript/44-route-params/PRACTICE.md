# 🏋️ Practice: Route Params

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a COPY of `refactored/navigate.ts` (so `ROUTES`, `Path`, `ParamNames` and `ExtractParams` are already there), or in a scratch `.ts` file inside the `typescript/` folder ending in `export {}`. Then run `npm run typecheck` from the repo root.

## Exercises

### ⭐ 1. `StaticPaths` — the routes that need no params (warm-up)

Some routes take params; `'/'` doesn't. Write a type that filters `Path` down to just the param-less ones, then a `navigateStatic(path: StaticPaths)` that takes no params argument at all.

**Practices:** the key-filtering idiom (map every member to itself-or-`never`, then index to collect), plus the `[T] extends [never]` test from LEARN 2.6.
**Hint:** `type StaticPaths = { [P in Path]: [ParamNames<P>] extends [never] ? P : never }[Path];` — the `[Path]` at the end is what turns the mapped object back into a union, and `never` members disappear from unions, which *is* the filtering.
**Check:** `Expect<Equal<StaticPaths, '/'>>` must compile; `navigateStatic('/')` must compile; `navigateStatic('/users/:id')` must error with roughly "not assignable to parameter of type '\"/\"'".

### ⭐⭐ 2. `matchPath()` — the derived type as a *return* type (core)

So far `ExtractParams<P>` has only typed an argument. Now go the other way: `matchPath(route, url)` takes a route and a concrete URL, and returns the extracted params — or `null` if the URL doesn't match.

**Practices:** using a derived type as a return type; runtime parsing and compile-time parsing agreeing.
**Hint:** `function matchPath<P extends Path>(route: P, url: string): ExtractParams<P> | null`. Split both strings on `'/'`, bail if the lengths differ, and for each segment either capture (`startsWith(':')`) or compare. The body accumulates a `Record<string, string>` and ends with one `as ExtractParams<P>`.
**Check:** `Expect<Equal<typeof matched, { id: string; postId: string } | null>>` must compile for `matchPath('/users/:id/posts/:postId', ...)`, `matched` must require a `!== null` check before use, and `matched.slug` must error inside the narrowed branch.

### ⭐⭐ 3. Next.js-style placeholders (core)

Express writes `/users/:id`; Next.js writes `/users/[id]`, and `/docs/[...slug]` for a catch-all that swallows the rest of the path. Write `NextParams<P>` so `'/users/[id]'` gives `{ id: string }`, `'/docs/[...slug]'` gives `{ slug: string[] }`, and a mixed route gives both.

**Practices:** ordering conditional checks, and **key remapping** (`as` in a mapped type).
**Hint:** classify each segment with a helper that tests `` `[...${infer N}]` `` *before* `` `[${infer N}]` `` (otherwise the second pattern matches `'...slug'` and swallows it), and tag catch-alls by returning `` `...${N}` ``. Then strip the tag in a mapped type's `as` clause while using it to choose the value type: `{ [K in Names as K extends `...${infer N}` ? N : K]: K extends `...${string}` ? string[] : string }`.
**Check:** `Expect<Equal<NextParams<'/shop/[category]/[...rest]'>, { category: string; rest: string[] }>>` must compile, and `nx.rest.toUpperCase()` must error ("Property 'toUpperCase' does not exist on type 'string[]'").

### ⭐⭐⭐ 4. Optional params — `'/posts/:id/:tab?'` (challenge)

A trailing `?` should make a param *optional in the type*: `{ id: string; tab?: string }`. Write `RequiredNames<P>`, `OptionalNames<P>`, and a `ParamsWithOptional<P>` that combines them.

**Practices:** splitting one union into two by a string-shape test, then applying `?` to only half the keys.
**Hint:** `:tab?` matches `` `:${infer N}` `` with `N = 'tab?'`, so classify with `N extends `${string}?``. A single mapped type can only make *all* keys optional, so build two and intersect them: `{ [K in RequiredNames<P>]: string } & { [K in OptionalNames<P>]?: string }`.
**Check:** `go('/posts/:id/:tab?', { id: '7' })` must compile, `{ id: '7', tab: 'comments' }` must compile, omitting `id` must error, and `tab: 42` must error. (Also `Expect<Equal<RequiredNames<'/posts/:id/:tab?'>, 'id'>>` — if `'id?'` shows up in there, your classification ran on the wrong side.)

### ⭐⭐⭐ 5. `dispatch()` — calling the right handler (challenge)

Given the `Handlers` table from the refactor, write `dispatch(table, path, params)` that looks up the handler for `path` and calls it with `params`. Both arguments must stay correlated: `dispatch(handlers, '/users/:id', { postId: '7' })` must not compile.

**Practices:** generic indexing into a mapped type — and finding the exact spot where TypeScript's inference gives up.
**Hint:** the signature is easy: `function dispatch<P extends Path>(table: Handlers, path: P, params: ExtractParams<P>): string`. The body is where it gets interesting — `table[path](params)` is rejected, because for a *generic* `P` the compiler treats `table[path]` as the union of all four handler types and refuses to call it with a single argument type.
**Check:** the two call sites above must behave as described, and `dispatch(handlers, '/nope', {})` must error. Then look closely at what your body needed and read the WHY below.

## Solutions

### 1. `StaticPaths`

```ts
type StaticPaths = { [P in Path]: [ParamNames<P>] extends [never] ? P : never }[Path];
type _s1 = Expect<Equal<StaticPaths, '/'>>;

function navigateStatic(path: StaticPaths): string {
  return path;
}
navigateStatic('/');
// @ts-expect-error — this route needs params, so it isn't static
navigateStatic('/users/:id');
```

**WHY:** two idioms stacked. The mapped type visits every member of `Path` and keeps it or replaces it with `never`; indexing the result with `[Path]` collects all the values into a union, and `never` contributes nothing — so the union is exactly the members that passed the test. The test itself needs the tuple wrappers, because a bare `ParamNames<P> extends never` would distribute and never fire (LEARN 2.6). The payoff is an API shape, not just a type: static routes get a one-argument function, which is impossible to describe when every path is `string`.

### 2. `matchPath()`

```ts
function matchPath<P extends Path>(route: P, url: string): ExtractParams<P> | null {
  const routeParts = route.split('/');
  const urlParts = url.split('/');
  if (routeParts.length !== urlParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < routeParts.length; i++) {
    const expected = routeParts[i]!;
    const actual = urlParts[i]!;
    if (expected.startsWith(':')) params[expected.slice(1)] = decodeURIComponent(actual);
    else if (expected !== actual) return null;
  }
  return params as ExtractParams<P>;
}

const matched = matchPath('/users/:id/posts/:postId', '/users/7/posts/42');
type _m1 = Expect<Equal<typeof matched, { id: string; postId: string } | null>>;
if (matched !== null) {
  matched.id.toUpperCase();
  // @ts-expect-error — only the route's own params exist
  matched.slug;
}
```

**WHY:** the same derived type now describes what comes *out*, which is where it pays the most — the caller of a parser normally has to guess. Note the shape of the trust: the loop is the runtime proof, the single `as ExtractParams<P>` at the end converts that proof into a compile-time fact, and `| null` keeps the failure case honest so callers must narrow (ts#05). This is ts#34's boundary pattern in miniature: validate once, then let the types carry it.

### 3. Next.js-style placeholders

```ts
type NameOf<S extends string> =
  S extends `[...${infer N}]` ? `...${N}` : S extends `[${infer N}]` ? N : never;

type NextParamNames<P extends string> =
  P extends `${infer Head}/${infer Rest}` ? NameOf<Head> | NextParamNames<Rest> : NameOf<P>;

type NextParams<P extends string> = {
  [K in NextParamNames<P> as K extends `...${infer N}` ? N : K]:
    K extends `...${string}` ? string[] : string;
};

type _n3 = Expect<Equal<NextParams<'/shop/[category]/[...rest]'>, { category: string; rest: string[] }>>;
declare const nx: NextParams<'/shop/[category]/[...rest]'>;
nx.rest.map((part) => part.length);
// @ts-expect-error — a catch-all is an array of segments, not a string
nx.rest.toUpperCase();
```

**WHY:** two lessons. First, **order matters in a conditional chain**, exactly as in a runtime `if/else`: `` `[${infer N}]` `` happily matches `'[...slug]'` with `N = '...slug'`, so the catch-all pattern has to be tested first. Second, the `as` clause in a mapped type lets you compute the *key* as well as the value — here it strips the `...` tag we used to smuggle "this one is a catch-all" through the union, while the value position reads the same tag to choose `string[]` over `string`. Carrying a marker in a string literal and decoding it later is a very common trick once route types get real.

### 4. Optional params

```ts
type RequiredNames<P extends string> = P extends `${infer Head}/${infer Rest}`
  ? (Head extends `:${infer N}` ? (N extends `${string}?` ? never : N) : never) | RequiredNames<Rest>
  : P extends `:${infer N}` ? (N extends `${string}?` ? never : N) : never;

type OptionalNames<P extends string> = P extends `${infer Head}/${infer Rest}`
  ? (Head extends `:${infer N}?` ? N : never) | OptionalNames<Rest>
  : P extends `:${infer N}?` ? N : never;

type ParamsWithOptional<P extends string> =
  { [K in RequiredNames<P>]: string } & { [K in OptionalNames<P>]?: string };

declare function go<P extends string>(path: P, params: ParamsWithOptional<P>): string;
go('/posts/:id/:tab?', { id: '7' });
go('/posts/:id/:tab?', { id: '7', tab: 'comments' });
// @ts-expect-error — the required one is still required
go('/posts/:id/:tab?', { tab: 'comments' });
// @ts-expect-error — and optional is still typed
go('/posts/:id/:tab?', { id: '7', tab: 42 });
```

**WHY:** the `?` is part of the captured name, not a separate token — `:tab?` gives you `'tab?'` — so the whole exercise is *classifying* that string. `OptionalNames` matches `` `:${infer N}?` `` and gets the clean name for free; `RequiredNames` matches the general shape and then rejects anything ending in `?`. The intersection at the end is the standard workaround for a real limitation: a mapped type applies its `?` modifier to every key it produces, so "some optional, some not" means two mapped types joined with `&`. (ts#43's practice 5 solves the same problem for schemas — same shape, different domain.)

### 5. `dispatch()`

```ts
function dispatch<P extends Path>(table: Handlers, path: P, params: ExtractParams<P>): string {
  const handler = table[path] as (p: ExtractParams<P>) => string;
  return handler(params);
}
dispatch(handlers, '/users/:id', { id: '7' });
dispatch(handlers, '/', {});
// @ts-expect-error — params must match the path
dispatch(handlers, '/users/:id', { postId: '7' });
// @ts-expect-error — unknown route
dispatch(handlers, '/nope', {});
```

**WHY:** the signature does everything the callers need — `P` is captured from the literal, `ExtractParams<P>` is computed from it, and mismatched pairs are rejected. The body is the honest part. `table[path]` has type `Handlers[P]`, and while `P` is still generic the compiler can only see "one of these four function types"; calling a union of functions requires an argument acceptable to *all* of them, which `ExtractParams<P>` isn't. TypeScript does not track the correlation between `path` and `table[path]` inside the function body — it only enforces it at the boundary. So you write one cast, right where the correlation is obvious to a human and invisible to the checker, and the exact signature keeps every caller safe. Knowing *where* the checker stops is as useful as knowing what it can do.
