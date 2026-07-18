# TS 38 — Declaring modules

**Lesson: types don't have to come *from* a library — a `.d.ts` file writes
down what you know about untyped code, once, and the epidemic door closes.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The team depends on a reliable, ancient, *untyped* JS library (vendored in
`vendor/`), and reaches for the usual hammers: `@ts-ignore` on the import
(or require-and-cast). Either way the library's entire surface becomes
`any`, and the vendor door becomes an epidemic entry point (ts#01): a
misnamed option (`sep` vs `separator`) is silently ignored, a number
argument crashes at runtime despite the docs saying strings-only, and the
`any` return spreads through everything computed from it. The team's
position — "the lib has no types, nothing we can do" — is the actual bug.

## What changed in the refactor

- **`legacy-slugify.d.ts`** sits next to the unchanged `.js` — same name,
  declaration extension — and TypeScript pairs them automatically. The
  file contains *only type claims*: the default export's true signature
  (strings only!), the real option name, and a typed guard. The import
  in `slugs.ts` is now clean — no ignores, no casts — and all three
  original failures are type tests.
- **The honesty contract**, stated in the file: a `.d.ts` is trusted like
  a type guard's body (ts#11) — a wrong one is a cast wearing a lab coat.
  Two disciplines follow: declare *what you use*, not everything (small
  claims, easily audited), and encode the *docs'* constraints (strings
  only) so the compiler enforces what the README could only mention.
- **The unvendored version** (noted in the code): for npm packages, check
  `@types/<pkg>` (DefinitelyTyped) first; otherwise `declare module
  'pkg' { ... }` in any `.d.ts` of yours — the same skill at a different
  address. Writing these is also exactly how you'd contribute the types
  upstream.

## Key takeaway

Untyped dependencies are a fact of life; untyped *usage* is a choice.
When a library ships no types, spend twenty minutes writing the `.d.ts`
for the slice you use — it converts the worst `any` source in your
codebase into checked, documented, autocompleting API surface.
