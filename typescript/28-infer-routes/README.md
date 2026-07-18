# TS 28 — infer & route parsing

**Lesson: the information was in the string literal all along — `infer` +
template patterns parse it out, at compile time.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`makeUrl(route, params: Record<string, string>)` — the runtime is fine
(js#35-style replace with a guard), but the types know nothing about
*which* params each route needs. So the `postld` typo compiles and
**throws at runtime**, and `/health` happily accepts junk params. The
irony the original points out: `'/users/:userId/posts/:postId'` is a
*string literal type* — `:userId` and `:postId` are sitting right there in
the type — and nothing was reading them.

## What changed in the refactor

- **`ParamsOf<Route>` is a type-level parser** — three cases, read like
  js#49's grammar:
  1. `` `${string}:${infer Param}/${infer Rest}` `` — a param followed by
     more route: capture it, **recurse** on the rest, merge;
  2. `` `${string}:${infer Param}` `` — a trailing param: capture it;
  3. otherwise `{}` — no params, and the empty object type makes junk
     params errors.
  `infer` is the capture group; the conditional is the match; recursion
  is the loop. This is js#49's recursive-descent instinct running in the
  type system — the same track, one level up.
- **The signature does the rest**: `makeUrl<Route extends string>(route:
  Route, params: ParamsOf<Route>)` — write a route inline and the params
  object is *computed from it*. Typo'd, missing, and extra params are all
  type tests now. Autocomplete knows your URL parameters.
- **The honest cast inside** the body is ts#20's contained-unsafety
  again: the type-level knowledge erases at runtime, so the body works
  with plain strings behind an exact public signature.
- This exact technique is how typed routers (and typed SQL/path/query
  libraries) work — you now know the trick behind their magic.

## Key takeaway

When a string's *shape* encodes structure — routes, paths, queries — that
structure lives in its literal type, and `infer` can extract it: pattern,
capture, recurse. You don't need this often; when you do, it converts a
whole category of "string and object must agree" runtime errors into
autocomplete.
