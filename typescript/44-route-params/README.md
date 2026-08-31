# TS 44 — Route params

**Lesson: the route string already contains the answer to both
questions — is this a real route, and which params does it need?
`ExtractParams<P>` reads them out of the literal.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`navigate(path: string, params: Record<string, string>)` is two lies in
one signature. `string` means *any* string is a route, so
`navigate('/uesrs/:id', ...)` compiles — and doesn't even throw: it
builds a URL nothing matches, the router renders Not Found, and the
logs stay empty. `Record<string, string>` means *any* key is a param,
so the `postld`-with-an-L typo compiles and throws, and a missing
`postId` compiles and throws.

Then someone renames `/settings/:section` to `/settings/:tab`. Every
call site still passes `{ section }`. Every call site still compiles.
Every call site now breaks the moment a user clicks it, and the only
tool that can find them is grep — which doesn't know which strings are
routes.

## What changed in the refactor

- **The route list becomes a type.** `ROUTES` is an `as const` array
  (ts#31), and `Path = (typeof ROUTES)[number]` turns it into a union
  of the four legal routes. `navigate<P extends Path>` now rejects
  `'/uesrs/:id'` before it can render a blank screen — the failure the
  original couldn't even *detect*, let alone report.
- **The params type is parsed from the path.** `ParamNames<P>` splits
  on `/` with a template-literal pattern and `infer` (ts#26/#28),
  asking each segment "do you start with `:`?" and unioning the
  answers; `ExtractParams<P>` maps that union to `{ [name]: string }`.
  One recursion, and the second argument's type is computed at every
  call site from the first argument's *value*.
- **`[ParamNames<P>] extends [never]`** — the tuple wrapper turns off
  distribution, because a bare `X extends never ? ...` distributes and
  a distributive conditional over `never` short-circuits to `never`,
  so the test would never fire. Param-less routes get
  `Record<string, never>` rather than `{}`, which is what makes
  `navigate('/', { probe: 'deep' })` an error (ts#28's footnote: `{}`
  accepts anything non-nullish).
- **The registry pays twice**: `Handlers = { [P in Path]: (params:
  ExtractParams<P>) => string }` (ts#25) is a handler table that can't
  drift — add a route and the object stops compiling until it's
  handled; rename `:section` to `:tab` and every `params.section`
  lights up red, at build time, everywhere, without grep.

## Key takeaway

ts#28 read params out of a route string; this is the same machinery
aimed at a whole app. Two ordinary types — a union of literals for
"which routes exist" and a template-literal parser for "what each one
needs" — convert an entire family of runtime failures (typo'd path,
typo'd param, missing param, junk param, renamed param) into red
squiggles. When a string is *structured*, `string` is the wrong type
for it.
