# 📘 Learning Guide: Route Params

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

Every app with more than one screen has a `navigate(path, params)` function. The path is a string like `'/users/:id/posts/:postId'`, and the `:id` and `:postId` placeholders get filled in from the params object. Typed the obvious way — `path: string, params: Record<string, string>` — the function accepts absolutely anything: a misspelled route, a misspelled param, a missing param, params for a route that has none.

But look at the path again. `'/users/:id/posts/:postId'` isn't just a string at runtime; it's a **string literal type** at compile time, and the answer is *inside it*. This exercise reads it out: a template-literal type walks the path, collects every `:name` segment, and produces `{ id: string; postId: string }`. Combined with a list of the app's real routes, `navigate` becomes a function you cannot misuse.

Exercise 28 did this for URL building. Here it's the whole navigation layer, plus the question 28 never asked: *is this even a route?*

## 2. Concepts you need first

### 2.1 String literal types

A string literal is a type of its own — the type containing exactly one value:

```ts
let mode: 'asc' = 'asc';
mode = 'desc'; // ❌ Error: '"desc"' is not assignable to type '"asc"'
```

`'/users/:id'` is a type in the same way. The characters are *in the type*, which is what makes the rest of this possible.

### 2.2 `as const` and `(typeof arr)[number]` — a list of values becomes a union of types

```ts
const ROUTES = ['/', '/users/:id'] as const;
type Path = (typeof ROUTES)[number]; // '/' | '/users/:id'

const ok: Path = '/users/:id';  // ✅
const no: Path = '/uesrs/:id';  // ❌ Error: not assignable to type Path
```

Two steps: `as const` stops the array from widening to `string[]` (exercise 31), and indexing a tuple type with `number` gives the union of its element types. This is the single most useful "value list → type" recipe in TypeScript.

### 2.3 Template literal types — pattern-matching on strings

A template literal *type* describes string shapes:

```ts
type Greeting = `hello ${string}`;
const a: Greeting = 'hello world'; // ✅
const b: Greeting = 'goodbye';     // ❌ Error
```

### 2.4 `infer` inside a template literal — capturing the pieces

Combine it with a conditional type and `infer` names the matched part:

```ts
type AfterColon<S> = S extends `:${infer Name}` ? Name : never;
type A = AfterColon<':postId'>; // ✅ 'postId'
type B = AfterColon<'posts'>;   // ✅ never — no colon, no match
```

Two `infer`s split a string at the first occurrence of a separator:

```ts
type Head<S> = S extends `${infer H}/${infer _Rest}` ? H : S;
type C = Head<'users/7/posts'>; // ✅ 'users'
```

### 2.5 Type-level recursion

A type can refer to itself, which is how you process the *rest* of the string:

```ts
type Segments<S extends string> =
  S extends `${infer Head}/${infer Rest}` ? Head | Segments<Rest> : S;
type D = Segments<'a/b/c'>; // ✅ 'a' | 'b' | 'c'
```

Read it as a loop: take the head, union it with the result of running yourself on the tail, and stop when there's no separator left.

### 2.6 Distributive conditionals, and how to switch them off

A conditional type whose checked type is a *naked type parameter* runs once per union member:

```ts
type ToArray<T> = T extends unknown ? T[] : never;
type E = ToArray<string | number>; // string[] | number[] — distributed
```

That's usually helpful, but it makes "is this exactly `never`?" impossible to ask, because `never` is the empty union and distributing over zero members produces `never`:

```ts
type IsNever<T> = T extends never ? true : false;
type F = IsNever<never>; // ❌ surprise: never, not true

type IsNeverFixed<T> = [T] extends [never] ? true : false;
type G = IsNeverFixed<never>; // ✅ true
```

Wrapping both sides in a one-element tuple stops distribution. This exercise needs it to detect param-less routes.

### 2.7 `{}` is not "the empty object"

```ts
const anything: {} = 42;              // ✅ (!) anything non-nullish fits
const junk: {} = { probe: 'deep' };   // ✅ (!)
const nothing: Record<string, never> = { probe: 'deep' }; // ❌ Error
```

So a route with no params must be typed `Record<string, never>` — a record whose values can't exist — if you want extra keys rejected.

### 2.8 Inferring a literal from an argument

```ts
declare function widened(path: string): void;
declare function captured<P extends string>(path: P): P;
const p = captured('/users/:id'); // p: '/users/:id' — the literal survives
```

Because `P` is a type parameter constrained to `string`, the compiler keeps the literal. That's what lets the *second* parameter's type depend on the first argument's *value*.

## 3. Walking through the original code

```ts
export function navigate(path: string, params: Record<string, string>): string {
  const url = path.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`navigate: missing param :${name}`);
    return encodeURIComponent(value);
  });
  visited.push(url);
  return url;
}
```

The runtime is fine — it even has a helpful error message. The signature is the problem, and it fails in four directions:

- `typoInParam()` passes `postld` (an L). `Record<string, string>` accepts every key, so this compiles; `params['postId']` is `undefined`; it throws.
- `missingParam()` omits `postId` entirely. Same throw.
- `typoInPath()` passes `'/uesrs/:id'`. Nothing throws — the regex finds `:id`, substitutes it, and returns `'/uesrs/7'`. The router matches nothing. The user sees a blank screen and the logs contain a successful navigation.
- `junkParams()` passes params to `'/'`, which has none. Compiles, silently ignored.

And `afterARename()` shows the maintenance failure: the route is now `'/settings/:tab'` while the call site still passes `{ section: 'billing' }`. Both halves are perfectly well-typed strings and objects.

## 4. What's wrong with it (in beginner terms)

**Bug story 1 — the blank screen.** QA files "clicking Settings does nothing." No error, no stack trace, no failed request. Three developers spend an afternoon before someone spots `/uesrs/` in a string. `string` as a parameter type means the compiler has no opinion about *which* strings are valid, so a typo in a route is indistinguishable from a route.

**Bug story 2 — the L that looks like an I.** `postld` vs `postId`. In most fonts these are the same picture. `Record<string, string>` says "any keys, all strings" — so the one thing you actually want checked (are these the *right* keys?) is the one thing it doesn't check.

**Bug story 3 — the rename.** Renaming a route param is a five-second edit that breaks an unknown number of call sites, none of which complain. This is the deep version of the problem: a rename is only safe when the compiler can find every use, and it can only find them if they're *typed*, not stringly-typed.

**The pattern:** all four failures come from types that are *wider than reality*. There are exactly four routes; the type says "any string." There are exactly two params; the type says "any keys."

## 5. Try it yourself first!

1. **Vague hint:** what type should `path` have, given that the app has exactly four routes? (Section 2.2 has the recipe.)
2. **Warmer:** the params type must *depend on which path was passed*. That means `navigate` has to be generic in the path: `navigate<P extends Path>(path: P, params: ???)`.
3. **Warmer still:** write `ParamNames<P>` — a recursive type that splits `P` on `/`, checks whether each segment starts with `:`, and unions the names it finds (sections 2.4 and 2.5). Test it with `type X = ParamNames<'/users/:id/posts/:postId'>` and hover it.
4. **Then:** turn that union of names into an object type with a mapped type: `{ [K in ParamNames<P>]: string }`.
5. **The trap:** a route with no params yields `never` keys, i.e. `{}`, which accepts junk (section 2.7). Detect it with `[ParamNames<P>] extends [never]` (section 2.6) and return `Record<string, never>` instead.
6. **Bonus:** now that `Path` is a union, write `Handlers = { [P in Path]: (params: ExtractParams<P>) => string }` and fill it in. Notice what happens when you add a fifth route.

## 6. Understanding the refactored solution

The registry, in two lines:

```ts
export const ROUTES = ['/', '/users/:id', '/users/:id/posts/:postId', '/settings/:section'] as const;
export type Path = (typeof ROUTES)[number];
```

One list, serving both worlds: a value you can iterate and a union the compiler enforces.

The parser:

```ts
export type ParamNames<P extends string> =
  P extends `${infer Head}/${infer Rest}`
    ? (Head extends `:${infer Name}` ? Name : never) | ParamNames<Rest>
    : P extends `:${infer Name}`
      ? Name
      : never;
```

Three cases, exactly like a hand-written recursive function: if there's a `/`, split off the head, classify it (a `:name` contributes its name, anything else contributes `never`, which vanishes from the union), and recurse on the tail. If there's no `/` left, classify the final segment. `ParamNames<'/users/:id/posts/:postId'>` is `'id' | 'postId'`.

The object type:

```ts
export type ExtractParams<P extends string> =
  [ParamNames<P>] extends [never] ? Record<string, never> : { [K in ParamNames<P>]: string };
```

The `[...]` wrappers are section 2.6's non-distribution trick, and `Record<string, never>` is section 2.7's junk-rejecting empty.

The function ties it together:

```ts
export function navigate<P extends Path>(path: P, params: ExtractParams<P>): string
```

`P extends Path` handles "is this a real route." `ExtractParams<P>` handles "what does it need." Because `P` is inferred from the literal you wrote, the second parameter's type is computed fresh at every call site.

The body still contains a cast — `(params as Record<string, string>)[name]` — because at runtime the parameter is just an object with string values and the regex looks up names dynamically. That's exercise 20's contained unsafety again: one cast inside the function, with an exact signature facing the callers.

Finally, the handler table:

```ts
export type Handlers = { [P in Path]: (params: ExtractParams<P>) => string };
```

A mapped type over the route union, where each entry's parameter is derived from its own key. Adding a route to `ROUTES` breaks this object until you handle it; renaming a param breaks every call site that uses the old name. That's the rename story from section 4 turned into a build failure — the outcome that makes this pattern worth the recursion.

## 7. Words you learned (glossary)

- **String literal type** — a type whose only value is one specific string.
- **`as const`** — a const assertion; keeps literal types instead of widening (exercise 31).
- **Indexed access on a tuple (`(typeof arr)[number]`)** — the union of an array type's element types.
- **Template literal type** — a type built from string patterns, `` `a${T}b` ``.
- **`infer`** — captures a piece of a type inside a conditional type (exercise 27/28).
- **Type-level recursion** — a type that refers to itself to process the rest of its input.
- **Distributive conditional type** — a conditional over a naked type parameter, applied once per union member.
- **Non-distribution trick (`[T] extends [U]`)** — tuple wrappers that make a conditional compare unions as wholes.
- **`Record<string, never>`** — an object type that rejects every key, unlike `{}`.
- **Mapped type over a union** — `{ [K in Union]: ... }`, one entry per member (exercise 25).
- **Stringly typed** — using `string` where a structured, closed set of values is meant.
- **Generic capture** — inferring a literal type from an argument by making the parameter generic.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the repo root after each change, then undo it.

1. Add `'/orders/:orderId'` to `ROUTES`. **Expected:** ❌ `handlers` stops compiling — "Property ''/orders/:orderId'' is missing." One list edit, one exhaustive to-do list. Add the handler and hover its `params`: `{ orderId: string }`, derived, never typed.
2. Rename `'/settings/:section'` to `'/settings/:tab'` in `ROUTES` (one word, one place). **Expected:** ❌ "Object literal may only specify known properties, `'/settings/:section'` does not exist in type `Handlers`", plus an implicit-`any` complaint about that handler's `params`. This is section 4's bug story 3 played back as a compile error: the rename found its own call sites, which was the entire point.
3. Delete the `as const` from `ROUTES`. **Expected:** ❌ exactly one error — the `navigate('/uesrs/:id', ...)` test reports "Unused '@ts-expect-error'". Read that carefully: `Path` widened to `string`, so *any* string is a route again and the typo'd-path protection silently evaporated, while everything else kept working (the param types are still parsed from the literal at each call site). One deleted word, one whole category of bug back. This is what ts#31 is protecting, and what the type test is for.
4. Change `ExtractParams` to `{ [K in ParamNames<P>]: string }` with no `[never]` branch. **Expected:** ❌ the `navigate('/', { probe: 'deep' })` test reports "Unused '@ts-expect-error'" — param-less routes went back to accepting junk, because their type is now `{}` (section 2.7).
5. Write `type Wrong = ParamNames<string>` and hover it. **Expected:** `never` — plain `string` matches neither template pattern, so a non-literal path parses to no params at all, and `ExtractParams<string>` becomes `Record<string, never>`: a route that accepts nothing. That's why `navigate` must capture `P` generically (section 2.8) instead of annotating `path: string`; the literal is the input to the parser.
6. Add a second placeholder style to the parser: make `ParamNames` also recognize `` `[${infer Name}]` `` segments, so `'/users/[id]'` yields `'id'`. **Expected:** ✅ compiles; you've extended a compile-time parser without touching a line of runtime code. (Then remember to teach the regex in `navigate` about it too — the two halves are independent, and keeping them honest is the job the type tests do.)
