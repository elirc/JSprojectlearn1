# TS 26 — Template literal types

**Lesson: strings with internal structure deserve types with internal
structure — `` `${A}:${B}` `` turns naming conventions into compiler checks.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

The `"<area>:<action>"` convention lives on a wiki, so it's enforced by
code review and hope — and the file shows the three classic decay modes,
each destined to break a dashboard three teams away: a missing colon (event
logged, silently dropped by the parser), wrong case (a *new* event that
splits the real one's numbers), and a typo'd area (a third shadow-category
of data). The CSS setter has the same disease: `'12 px'` is silently
invalid. `string` can't say "this *shape* of string," so structured strings
are checked by nothing.

## What changed in the refactor

- **`` type EventName = `cart:${CartAction}` | ... ``** — TypeScript
  expands the template into the **cross product** of literal combinations:
  six exact event names, *derived* from small unions (ts#06's pieces,
  composed). All three decay modes — plus the subtler `'cart:complete'`
  (valid area, valid action, wrong pairing) — are type tests now. The
  wiki page became a type.
- **`` type CssLength = `${number}px` | `${number}rem` | '0' ``** —
  `${number}` matches numeric literals including decimals, so `'1.5rem'`
  passes and `'12 px'`/`'twelve'` don't. Shape-checking for value strings.
- **The manipulation types** — `Capitalize`, and friends (`Uppercase`,
  `Lowercase`, `Uncapitalize`) — derive names from names:
  `` `on${Capitalize<E>}` `` is how libraries type `'click'` → `'onClick'`
  conventions. Project 28 pushes this further with `infer` to *parse*
  strings at the type level.
- Same autocomplete dividend as ts#06, now for structured names: typing
  `track('` offers the six real events.

## Key takeaway

Any string family with a grammar — `area:action` events, `12px` values,
`/users/:id` routes, `user_${id}` keys — can have that grammar written as
a template literal type. Conventions that used to live in wikis and code
review become squiggles, and the cross-product expansion means you
maintain the *pieces*, not the combinations.
