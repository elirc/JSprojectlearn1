# TS 31 — as const

**Lesson: TypeScript *widens* your exact values into vague kinds — `as const`
keeps them as written: literals, readonly, real tuples.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

Widening, three ways: `{ env: 'production' }` types as `string` (the exact
value the author *wrote* is discarded, keeping only its kind), so a
literal-union parameter rejects it and the author casts back to
`'production'` — re-asserting what the compiler knew two lines earlier and
threw away (ts#14's smell, caused by the type system itself). `[0, 0]`
widens to `number[]` — length and order forgotten, cast #2. And the
"constant" locale list is a mutable `string[]` that happily accepts
`push('klingon')`.

## What changed in the refactor

- **`as const` on values-as-facts**: the config keeps
  `readonly env: 'production'; readonly port: 443` — full precision, so
  `connect(config.env, ...)` needs no cast. `[0, 0] as const` is a real
  `readonly [0, 0]` tuple. This is `as`'s blessed form (ts#14's noted
  exception): it *narrows* to what's literally there rather than
  overruling — the one `as` that can't lie.
- **Constant lists complete the ts#07 idiom**:
  `(typeof SUPPORTED_LOCALES)[number]` derives `'en' | 'de' | 'fr'` from
  the list — union follows data, and `push('klingon')` is now a type
  test (readonly came free with the `const`).
- **Why widening exists** (the fairness note in the code): for *mutable
  bindings* it's correct — `let mode = 'dark'` should accept `'light'`
  later. Widening is right for variables; `as const` is right for facts.
  The skill is telling which one you're writing.
- Related tools, for the map: `satisfies` (ts#14) checks a shape while
  keeping precision; `as const` keeps precision without checking a
  shape; they compose (`{...} as const satisfies Config`) when you want
  both.

## Key takeaway

When you write a literal object, array, or tuple that represents *fixed
facts* — configs, constant lists, coordinate tuples, lookup tables —
suffix it `as const`. You get literal types (no casts later), readonly
(no mutation), preserved tuples (no length amnesia), and derivable unions
for free. If you're casting a value back to what you literally wrote,
widening ate it; `as const` is the antidote.
