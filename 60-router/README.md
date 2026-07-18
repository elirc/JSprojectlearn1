# 60 — Client-side router

**Lesson: the URL is state. Routes are data, matching is a pure function,
and only the glue layer knows a browser exists.**

## Run it

Open both HTML files; click around, then hand-edit the hash (try
`#/users/9`, `#/Users`, `#/broken/link`) in each.

```
node --test 60-router/
```

## What's wrong with the original?

1. **The router is a `switch` over exact strings** — `#/users/:id` is
   inexpressible, so there's a hand-written case *per user* (see cases
   `#/users/7` and `#/users/8`; user 9 breaks).
2. **Matching + rendering + data access are one blob per case**, living
   inside a browser event handler. Zero of it is testable.
3. **No 404**: an unknown hash falls through the switch and the *old page
   silently stays on screen* under a wrong URL — the SPA equivalent of a
   lie.
4. Exact-string comparison means `#/Users` ≠ `#/users`, trailing-slash
   variants all miss, and every such fix is another case.

## What changed in the refactor

- **`matchRoute(routes, path)` is pure** and lives in `router.js` with ten
  tests, no `window` in sight. Routes are a data table (project 10's
  dispatch move): pattern + view. Adding a page = adding a row.
- **Patterns compile to segments**; `:id` segments capture (URL-decoded)
  params, static segments compare case-insensitively while param *values*
  keep their case. Segment-count check first — `/users/7/x` can't
  accidentally match `/users/:id`.
- **First match wins**, so ordering the table controls specificity:
  `/users/new` above `/users/:id` is the classic.
- **`null` means 404**, and the caller renders a real not-found view —
  "no route" is a state you design, not a fall-through you forget.
- **Views are functions of params returning DOM nodes**, built with
  `textContent` — params come from the URL, and the URL is user input
  (project 35's XSS rule applies to the address bar too).
- The HTML shell is ~15 lines of glue: `hashchange` → `hashToPath` →
  `matchRoute` → replaceChildren. Swapping to the History API would touch
  only this layer — the matcher wouldn't know.

## Key takeaway

Treat the URL as the primary copy of "where am I": render *from* it,
never alongside it, and back/forward/bookmark/refresh all work for free.
That inversion — plus routes-as-data — is 90% of what React Router and
friends do; the remaining 10% is glue you just read in fifteen lines.
