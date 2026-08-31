# 📘 Learning Guide: infer & Route Parsing

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A tiny URL builder: `makeUrl('/users/:userId', { userId: '7' })` produces `'/users/7'`. The `:userId` part is a **route parameter** — a placeholder in the path that gets filled in.

In the original, the params argument is typed `Record<string, string>` — "any keys at all." So a typo'd key (`postld` instead of `postId`) compiles fine and *throws at runtime*, and a route with no params happily accepts junk.

The twist: the route string `'/users/:userId/posts/:postId'` is a **string literal type**. The names `:userId` and `:postId` are *sitting right there in the type* — and nothing reads them. This exercise builds `ParamsOf<Route>`: a type-level **parser** that extracts the parameter names from the route string at compile time, so the params object is computed from the route itself.

This is the trick behind "magic" typed routers. After this exercise, you know how the magic works.

## 2. Concepts you need first

### 2.1 String literal types (recap from exercise 06)

When you write a string inline, TypeScript can track its *exact* value as a type:

```ts
function f<R extends string>(route: R): R { return route; }
const r = f('/users/:id'); // r's TYPE is '/users/:id' — the exact string
```

That exactness is what makes compile-time parsing possible: the compiler can see every character.

### 2.2 Template literal patterns for *matching* (builds on exercise 26)

Exercise 26 used templates to *build* string types. In a conditional's `extends` clause, the same syntax *matches* string types — like a pattern test:

```ts
type StartsWithSlash<S> = S extends `/${string}` ? true : false;
type A = StartsWithSlash<'/home'>; // true
type B = StartsWithSlash<'home'>;  // false
```

### 2.3 Conditional types and `infer` (recap from exercise 27)

`T extends Pattern ? X : Y` is the type-level if/else, and `infer Name` captures part of the matched pattern (see exercise 27's LEARN.md for the full introduction). With template patterns, `infer` captures *pieces of a string*:

```ts
type AfterColon<S> = S extends `${string}:${infer Rest}` ? Rest : never;
type A = AfterColon<'/users/:id'>; // 'id'
```

Read: "if S looks like ⟨anything⟩`:`⟨something⟩, capture the something."

### 2.4 Recursion — the type-level loop

A conditional type can call itself. Match a piece, capture it, recurse on the rest — exactly how you'd eat through a string in ordinary code:

```ts
type CountSegments<S> = S extends `${string}/${infer Rest}`
  ? CountSegments<Rest> // eat one segment, keep going
  : 'done';
```

Pattern, capture, recurse: that's a parser.

### 2.5 Mapped types over a union of names (recap from exercise 25)

`{ [K in 'a' | 'b']: string }` produces `{ a: string; b: string }`. If a parser can produce the union `'userId' | 'postId'`, a mapped type turns it into the params *object* type.

```ts
type Params = { [K in 'userId' | 'postId']: string };
// { userId: string; postId: string }
```

### 2.6 `Record<string, never>` vs `{}` — the empty object trap

Surprise: the type `{}` does **not** mean "an object with no properties." It means "anything that isn't null/undefined" — so it accepts *everything* and rejects nothing:

```ts
const a: {} = { anything: 'goes' };            // ✅ OK (!) — {} rejects nothing
const b: Record<string, never> = {};           // ✅ OK
const c: Record<string, never> = { junk: 'x' }; // ❌ Error: string is not never
```

`Record<string, never>` says "any key you try to add must have type `never` — the impossible type — so no key can be added." *That* is the real "empty object" type. The refactor depends on this distinction.

### 2.7 `never` — the impossible type

`never` is the type with no values at all. Nothing is assignable to it (except `never` itself). It shows up when you want to make something *unwritable* — like the values of a must-stay-empty object.

### 2.8 Contained type assertions (recap from exercise 23)

Inside the refactored function body you'll see `params as Record<string, string>`. Type-level knowledge **erases at runtime** — the running JavaScript just sees plain strings and objects. So the body does one honest `as` behind a fully-checked public signature. Contained, audited, fine.

## 3. Walking through the original code

The function:

```ts
export function makeUrl(route: string, params: Record<string, string>): string {
  return route.replace(/:([A-Za-z]+)/g, (_, name) => {
    const value = params[name];
    if (value === undefined) throw new Error(`missing param :${name}`);
    return encodeURIComponent(value);
  });
}
```

Plain English: find every `:name` in the route (that's the regular expression `/:([A-Za-z]+)/g`), look up `name` in the params object, and substitute it in (encoded for URL safety). If a param is missing — throw. The runtime logic is solid.

The types are the problem. `route: string` — any string, exactness discarded. `params: Record<string, string>` — any keys accepted.

The two failure modes, both compiling:

```ts
export const b = makeUrl('/users/:userId/posts/:postId', {
  userId: '7',
  postld: '42', // TYPO (postld). Compiles — and THROWS at runtime.
});
```

The route needs `postId`; the object has `postld`. `Record<string, string>` shrugs. At runtime, the replace hits `:postId`, finds `undefined`, and throws.

```ts
export const c = makeUrl('/health', {
  probe: 'deep', // extra junk for a route with NO params
});
```

The reverse failure: junk params on a param-less route, silently ignored.

## 4. What's wrong with it (in beginner terms)

**Bug story — the crash in the release build.** A developer renames a param, updates three call sites, typos the fourth: `postld`. Everything compiles. Tests don't cover that page. A user clicks a post link — the app throws `missing param :postId` and shows an error screen. This is the worst kind of bug: the information needed to catch it existed *at compile time* (the route string literally spells `postId`), and nobody was reading it.

**Bug story — the junk that lies.** `makeUrl('/health', { probe: 'deep' })` looks like it configures a deep health probe. It doesn't — the param is silently discarded. Someone will debug "why isn't the deep probe running?" for an afternoon.

The README's word for the fix: the route string is a *literal type*; `:userId` and `:postId` are in the type; `infer` can pull them out.

## 5. Try it yourself first!

This one is a puzzle. Give it a genuine try — even partial progress teaches a lot.

1. **Vague hint:** you want a type `ParamsOf<Route>` such that `ParamsOf<'/users/:userId'>` is `{ userId: string }` and `ParamsOf<'/health'>` is an empty-object type. Then `makeUrl<Route extends string>(route: Route, params: ParamsOf<Route>)`.
2. **Warmer:** start with routes that have exactly one *trailing* param. Match `` `${string}:${infer Param}` `` and produce `{ [K in Param]: string }`.
3. **Warmer still:** for a param in the *middle* (`/users/:userId/posts/...`), match `` `${string}:${infer Param}/${infer Rest}` `` — capture the param *and* the rest — then recurse on the rest and merge the results. Merging trick: `{ [K in Param | keyof ParamsOf<Rest>]: string }`.
4. **The gotcha:** for the no-params case, do NOT return `{}` — remember section 2.6. Return `Record<string, never>` so junk params get rejected.
5. **Order matters:** check the "param followed by more route" case *before* the "trailing param" case, or the trailing match will grab `userId/posts/:postId` as one giant param name.

## 6. Understanding the refactored solution

The parser, three cases:

```ts
export type ParamsOf<Route extends string> =
  Route extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ParamsOf<`/${Rest}`>]: string }
    : Route extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : Record<string, never>;
```

Read it like a grammar:

1. **A param followed by more route** — `⟨anything⟩:⟨Param⟩/⟨Rest⟩`. Capture `Param`, recurse on the rest (re-prefixed with `/` so the pattern shapes stay consistent), and merge: the mapped type loops over `Param` *plus* all the keys the recursive call found. That union-of-keys merge is how `{userId}` and `{postId}` become one object.
2. **A trailing param** — `⟨anything⟩:⟨Param⟩` with no slash after. Capture it; base case one.
3. **No colon at all** — no params. Result: `Record<string, never>`, the truly-empty object type. The comment in the file explains why not `{}`: `{}` accepts anything non-null, so junk params would slip through; never-valued records reject every extra key.

`infer` is the capture group; the conditional is the match; recursion is the loop. It's a recursive-descent parser running inside the type checker.

The signature does the rest:

```ts
export function makeUrl<Route extends string>(
  route: Route,
  params: ParamsOf<Route>,
): string {
```

Because `Route` is a generic constrained to `string`, writing a route *inline* keeps its literal type, and the params type is **computed from it**. Typo'd, missing, and extra params are all compile errors now — the three type tests at the bottom prove each one. And your editor autocompletes the param names for every route.

One honest note in the body: `(params as Record<string, string>)[name]`. At runtime, all this type magic has erased — there's just a string and an object. The cast is contained behind an exact public signature (the same pattern as exercise 23's engine).

## 7. Words you learned (glossary)

- **Route parameter** — a `:name` placeholder in a URL path, filled in later.
- **String literal type** — a type that is one exact string, preserving every character for the compiler to inspect.
- **Template literal pattern** — backtick syntax used in `extends` to *match* string types.
- **`infer`** — captures a piece of a matched pattern (exercise 27).
- **Recursion (type-level)** — a type that refers to itself to process arbitrarily long input.
- **Parser** — code (or here, a type) that reads structured text and extracts its parts.
- **Base case** — the non-recursive branch that stops a recursion.
- **`never`** — the type with no values; nothing can be assigned to it.
- **`Record<string, never>`** — the genuinely-empty object type: every attempted key errors.
- **`{}` (empty object type)** — a trap: it means "anything non-null," not "no properties."
- **Type erasure** — types vanish at runtime; the JavaScript that runs has no type information.
- **Contained cast** — a single audited `as` inside a body whose public signature stays fully checked.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change, then undo it.

1. In `refactored/router.ts`, add `export type P3 = ParamsOf<'/a/:x/b/:y/c/:z'>;` and hover it. **Expected:** `{ x: string; y: string; z: string }` — the recursion handles any number of params.
2. Add a call `makeUrl('/teams/:teamId/members/:memberId', { teamId: 't1' })`. **Expected:** ❌ Error — `memberId` is missing. Add it — **Expected:** ✅ clean.
3. Change the third branch from `Record<string, never>` to `{}` and look at the `makeUrl('/health', { probe: 'deep' })` type test. **Expected:** "Unused '@ts-expect-error'" — junk now slips through. This demonstrates the `{}` trap live.
4. Sabotage the case order: swap branch 1 and branch 2 (check the trailing-param pattern first). **Expected:** hover `P1` — the whole tail `'userId/posts/:postId'`-ish mess gets captured as one weird param name, and the `a` call errors. Order in pattern matching matters.
5. Store a route in a plain variable first: `const r = '/users/:id'; makeUrl(r, { id: '1' });` — then try `let r = '/users/:id';` instead of `const`. **Expected:** with `const`, it still works (the literal type is kept); with `let`, `r` widens to `string` and the params type degrades to the no-param case, so `{ id: '1' }` errors. Exercise 31 explains this widening behavior in depth.
