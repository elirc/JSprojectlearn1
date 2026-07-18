# React 42 — Hash router (URL as state)

**Lesson: screens users think of as *places* deserve addresses — the URL is
state the browser persists, shares, and navigates for you.**

## Run it

Open `original.html`, navigate to an article, press F5: you're dumped back on
Home. Press browser-back: you leave the site. Refactor: F5 keeps your place,
back/forward walk your history, and the address bar is shareable.

## What's wrong with the original?

`view` and `articleId` in `useState` — project 16's phase pattern, which was
*right* for wizard steps — applied to something that isn't ephemeral UI state:
**location**. Three broken user expectations follow directly:

1. **Refresh forgets where you were** (state dies with the page).
2. **Back/forward don't work** — the browser never heard about your "pages".
3. **No link can point at an article** — the address bar reads the same
   everywhere, so sharing/bookmarking is impossible.

The distinction worth learning: wizard steps are *transient* (16's state was
correct); screens are *places*. Places get addresses.

## What changed in the refactor

- **`useHashRoute()`** — the URL hash becomes the source of truth, and the
  hook *synchronizes* React with it: subscribe to `hashchange`, cleanup on
  unmount (project 18), lazy-read the initial hash (project 23). A textbook
  project-21 "outside world" effect — the outside world here is the address
  bar.
- **Navigation became `<a href="#/articles/keys">`** — plain links. No
  onClick, no preventDefault, no setView: the browser updates the hash, the
  hook hears it, React re-renders. New-tab/middle-click work for free because
  they're real links.
- **The route is parsed, then matched** — `['articles', 'keys']` from the
  hash, and App's render is a route table (04's conditional ladder). Unknown
  ids get a Not-found page: URLs are *input*, and input gets validated
  (js#30).
- **All three broken expectations fix themselves** — persistence, history,
  shareability — because the browser already implements them *for URLs*.
  Moving state into the URL rents decades of browser behavior for free.
- Real apps: React Router + `history.pushState` for clean `/articles/keys`
  paths — same architecture (URL ⇄ state sync + route matching), more
  machinery. The hash version is the same idea small enough to own.

## Key takeaway

For every piece of UI state ask: *would a user expect this to survive refresh
or live in a shared link?* Filters, tabs, selected items, pages — if yes, its
home is the URL, not `useState`. Sync with the address bar and the browser
becomes your persistence layer, undo stack, and sharing feature at once.
