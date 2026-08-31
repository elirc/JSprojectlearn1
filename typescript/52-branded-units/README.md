# TS 52 — Branded units

**Lesson: ts#29's brand, pointed at physical units — pixels, ems and
milliseconds are three species of number, and mixing them renders garbage
instead of crashing, which is why nothing catches it.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`card(width: number, padding: number, fontSize: number)` and
`fadeIn(duration: number)` describe four different quantities with one type,
so all three constants are interchangeable to the compiler.
`card(FADE, TITLE_SIZE, GUTTER)` typechecks and produces
`width:250px;padding:1.5px;font-size:16em` — a card sized by a quarter-second
fade, one-and-a-half-pixel padding, and a title sixteen times the body text.
It **renders**. Nothing throws. QA files it as "styling looks weird on the
pricing page", and the bug is three arguments in the wrong order.

`fadeIn(GUTTER)` gives a 16-millisecond transition, which reads as "the
animation isn't working" rather than "someone passed the wrong constant".
`GUTTER + TITLE_SIZE` is `17.5` — of what? And `scaleAll([GUTTER, TITLE_SIZE,
FADE], 2)` doubles three units in one array and hands back `number[]`,
spendable anywhere. Worst of all, the unit **suffix** is applied by whoever
formats last, far from whoever chose the value.

## What changed in the refactor

- **Three brands from one helper**: `type Brand<T, Name extends string> = T &
  { readonly __unit: Name }`, then `Px`, `Em`, `Ms`. Zero runtime cost — a
  `Px` *is* a number, fully erased.
- **Doors are the only way in**, each holding one honest cast plus runtime
  validation where it earns its keep: `ms()` rejects negatives, `px()`
  rejects non-finite values (ts#13's boundary, applied to a single number).
- **Arithmetic helpers preserve the brand.** Raw `a + b` on two `Px` yields a
  plain `number` — math strips brands — so `addPx` returns through the door,
  and the generics `scale<T extends Unit>(value: T, factor: number): T` and
  `sum<T extends Unit>(values: readonly T[]): T` carry any unit through and
  hand back *the same one*.
- **Conversion functions are the only doors between units**: `emToPx`,
  `pxToEm`, `secondsToMs`. The `* rootSize` lives in exactly one audited
  place instead of being scattered and sometimes forgotten.
- **Each formatter owns one suffix**, and only its own unit can reach it — so
  `${value}px` can never disagree with what `value` means.
- Nine type tests replay every original mix-up: the swapped `card`
  arguments, `fadeIn(GUTTER)`, cross-unit addition, bare numbers, `scale` and
  `sum` preserving brands, a mixed-unit array, an unconverted `Em`, and
  `emToPx` called backwards.

## Key takeaway

A number with a unit is not a number — it's a *quantity*, and dropping the
unit is what makes every mix-up compile. CSS lengths, durations, bytes,
degrees vs radians, cents vs dollars (ts#29), latitudes vs longitudes: brand
them, make constructors the only doors, keep conversion in named functions,
and write arithmetic helpers that return branded results so a unit survives a
whole calculation. NASA lost a Mars orbiter to this bug class; your layout
just looks weird on the pricing page, which is arguably worse, because
nothing ever alerts you.
