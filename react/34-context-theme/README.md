# React 34 — Context for prop drilling

**Lesson: when a value is *ambient* — needed anywhere, owned by no one branch —
context replaces the courier chain. Package it as Provider + custom hook.**

## Run it

Open both files — identical UI. Then read the component signatures: the
original threads `theme` through five; the refactor through zero.

## What's wrong with the original?

`theme` appears in **five** component signatures; **one** reads it. Page,
Toolbar, ActionsMenu, and SaveSection are couriers — coupled to cargo they
don't care about. The costs compound: every new ambient value (locale, current
user, feature flags) re-walks the same hallway widening every signature;
renaming the prop touches five files; and no middle component can be reused
elsewhere without inheriting the theme luggage.

To be clear — *some* prop passing is healthy (one or two levels is just data
flow, and explicit beats ambient). Drilling is the pathology: **many levels of
pure forwarding to reach a distant reader.**

## What changed in the refactor

- **The theme became a module**: `ThemeContext` + `ThemeProvider` + `useTheme`.
  The provider owns the state (and stabilizes its value with `useMemo` —
  project 33's discipline); consumers call `useTheme()` from any depth. The
  couriers dropped to zero props.
- **The custom hook is the only consumption door**, and it *throws* if there's
  no provider above — a named, immediate error instead of a cryptic null crash
  three components later (js#30's fail-loud-at-the-boundary). This
  Provider+hook packaging is the standard shape for every context you'll ever
  ship.
- **What belongs in context**: ambient, slow-changing, read-in-many-places
  values — theme, locale, current user, feature flags. What doesn't: anything
  one branch owns (props are better), anything fast-changing (project 33's
  firehose problem), or "all app state" (project 41 shows the disciplined
  version of that).
- Worth noticing: before reaching for context, *composition* often dissolves
  drilling — if Page took `children` and App rendered `<Page><SaveButton/>
  </Page>`, the button would sit next to its data (project 06's lesson). Try
  that first; context is for when consumers are genuinely scattered.

## Key takeaway

Context is dependency broadcasting for ambient values. Wrap each one in a
Provider component and a `useX()` hook that fails loudly when unprovided —
then middle components stay couriers of nothing, and distant readers reach
straight up.
