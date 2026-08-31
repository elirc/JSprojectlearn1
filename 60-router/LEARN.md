# 📘 Learning Guide: Client-Side Router

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **router**: the piece of a web page that looks at the URL and decides *which screen to show*.

Open `original.html` in a browser (double-click it — no server, no internet needed). You see a nav bar: Home, Users, Ada, About. Clicking "Users" changes the URL to end in `#/users` and swaps the page content to a user list — *without reloading the page*. That's a **single-page application** (SPA): one HTML file that repaints itself as you "navigate."

Sample behavior:

- URL ends in `#/` → page shows **Home**
- URL ends in `#/users` → page shows **Users** with a list
- URL ends in `#/users/7` → page shows **Ada Lovelace**
- URL ends in `#/users/9` (original) → page shows... whatever was there before. Bug!

The refactor makes a router where `/users/anything` works, wrong URLs show a real 404 page, and the matching logic can be tested without a browser at all.

## 2. Concepts you need first

### The DOM
The **DOM** (Document Object Model) is the browser's live, in-memory version of your HTML — a tree of objects JavaScript can read and change. Change the DOM and the screen updates.

```js
const box = document.getElementById("app"); // find <div id="app">
box.textContent = "Hello!";                 // the page now shows: Hello!
```

### innerHTML vs. textContent (and XSS)
`innerHTML` sets content *as HTML* — tags in the string become real elements. `textContent` sets it as *plain text* — tags are shown literally, never executed.

```js
box.innerHTML = "<b>hi</b>";    // page shows a bold "hi"
box.textContent = "<b>hi</b>";  // page shows the 7 characters: <b>hi</b>
```

Why care? **XSS** (cross-site scripting) is the attack where user-controlled text gets treated as HTML and runs code. The URL is user input — anyone can type anything after the `#`. So URL data must go through `textContent`, never `innerHTML`.

### The URL hash and hashchange
Everything after `#` in a URL is the **hash** (also called the fragment). Changing it does NOT reload the page — the browser just fires a `hashchange` **event** (a notification that something happened). JavaScript reads it via `location.hash`:

```js
// if the address bar shows  my-page.html#/users/7
console.log(location.hash); // prints: #/users/7
window.addEventListener("hashchange", () => console.log("moved!"));
```

`addEventListener(name, fn)` says "call `fn` whenever event `name` fires." This is why hash routing works offline from a plain file: no server ever sees the hash.

### Events and event handlers
An **event handler** is the function you register for an event. The original uses the older style `window.onhashchange = route` — one slot, like the last project's single `beforeEach`. `addEventListener` is the modern style and allows many listeners.

### String methods you'll see
```js
console.log("/users/7".split("/"));        // prints: [ '', 'users', '7' ]
console.log(["", "users", "7"].filter(Boolean)); // prints: [ 'users', '7' ]
console.log(":id".startsWith(":"), ":id".slice(1)); // prints: true 'id'
console.log("AdA".toLowerCase());          // prints: ada
```

`split("/")` cuts a string at every `/`. `filter(Boolean)` throws away empty strings (empty string counts as false). `slice(1)` drops the first character.

### URL encoding
URLs can't contain spaces or many symbols, so browsers encode them: a space becomes `%20`. `decodeURIComponent("ada%20lovelace")` gives back `"ada lovelace"`. A router must decode, or users see `%20` on screen.

### Pure functions and testability
A **pure function** depends only on its arguments and touches nothing outside (no `window`, no DOM, no printing). Pure functions can run in Node (JavaScript outside the browser) — which means automated tests can call them. Code that lives inside a browser event handler and pokes the DOM can only be tested by clicking around by hand.

### Data-driven design (dispatch tables)
Instead of a chain of `if`/`case` branches, put the possibilities in an *array of objects* and write one loop that consults it:

```js
const routes = [{ path: "/about", view: () => "About page" }];
const found = routes.find((r) => r.path === "/about");
console.log(found.view()); // prints: About page
```

Adding a page becomes adding a row of data — no new logic.

### Route patterns and params
A **route pattern** like `/users/:id` means "the literal segment `users`, then *any* value, which we capture under the name `id`." The captured values are called **params** (parameters). One pattern replaces infinitely many exact-string cases.

## 3. Walking through the original code

The nav is plain links whose `href`s only change the hash:

```html
<a href="#/">Home</a>
<a href="#/users">Users</a>
<a href="#/users/7">Ada</a>
```

The "router" is one function, a `switch` over the exact hash string:

```js
function route() {
  var hash = location.hash;
  switch (hash) {
    case "":
    case "#/":
      document.getElementById("app").innerHTML = "<h1>Home</h1>";
      break;
```

Two spellings of "home" (empty hash on first load, `#/` after clicking) are handled by stacking cases. The users page builds an HTML string in a loop and shoves it in with `innerHTML`.

Then the workaround that gives the game away:

```js
case "#/users/7":
  document.getElementById("app").innerHTML = "<h1>" + USERS[7] + "</h1>";
  break;
case "#/users/8":
  document.getElementById("app").innerHTML = "<h1>" + USERS[8] + "</h1>";
  break;
```

A hand-written case *per user*. A `switch` compares exact strings, so "any user id" is literally inexpressible — every new user means editing the router.

Finally the wiring:

```js
window.onhashchange = route;
route();
```

Re-route whenever the hash changes, and once on page load (the URL you arrive with already says where you are).

## 4. What's wrong with it (in beginner terms)

**1. Exact strings can't express patterns.** *How it bites you:* your site gains user number 9. Nobody edits the router. Every link to `#/users/9` shows... the previous page, silently. Support tickets say "the app is frozen"; actually the router just shrugged.

**2. Everything is one blob inside a browser event handler.** Matching the URL, building HTML, reading the USERS data — all fused together, all needing a real browser to run. *How it bites you:* you can't write a test that asks "does `/users/7` route to the user page?" without opening a browser and looking with your eyes. Refactors become scary, so nobody refactors.

**3. No 404.** Unknown hashes fall through the `switch` and *nothing happens* — the old content stays under a wrong URL. *How it bites you:* a marketing email ships with a typo'd link. Thousands of people land on a page whose URL says one thing and whose content says another. Nobody sees an error, so nobody reports it correctly.

**4. Exact comparison is brittle in a dozen small ways.** `#/Users` (capital U) is a different string, so it misses. `#/users/` (trailing slash) misses. Each fix is yet another `case`, forever.

**5. `innerHTML` everywhere.** Fine while every string is hard-coded — but the moment URL data flows into those strings, you've built an XSS hole. The refactor switches to `textContent` before that day comes.

## 5. Try it yourself first!

Hints, vaguest first:

1. The `switch` compares whole strings. What if you compared URLs *piece by piece* instead?
2. Split both the pattern and the actual path on `/`. `/users/:id` becomes `['users', ':id']`; `/users/7` becomes `['users', '7']`. Now compare segment by segment.
3. Rule per segment: if the pattern segment starts with `:`, it matches anything — save the actual value in a `params` object under the name after the `:`. Otherwise the segments must be equal (compare lowercased).
4. Check lengths first! `/users/7/extra` has 3 segments and must NOT match the 2-segment pattern `/users/:id`.
5. Put routes in an array of `{ path, view }` objects. Loop; first match wins. If the loop ends with no match, return `null` — and make the caller render a 404 view for `null`.
6. Keep `matchRoute(routes, path)` free of `window`/`document` — pass the path in as a plain string. That's what makes it testable in Node.

## 6. Understanding the refactored solution

**`router.js` — the pure heart.** Two exported functions, zero browser code.

`compile(pattern)` turns `"/users/:id"` into `['users', { param: 'id' }]`: split on `/`, drop empties, and map each segment to either a lowercased string (static) or a `{ param }` object (capture). Representing "static vs. param" as *different types* makes the matcher's job a simple `typeof` check.

`matchRoute(routes, path)` splits the path the same way, then for each route: skip if segment counts differ (the `/users/7/x` guard), then walk the segments — param segments capture the (URL-decoded) value into `params`; static segments must equal the lowercased path segment. First route that survives wins, returning `{ route, params }`. No route survives → return `null`. Note the division of labor: the matcher *reports* "no match"; what a 404 looks like is the **caller's** decision.

Because matching is first-wins, *order is a feature*: put `/users/new` above `/users/:id` and the word "new" goes to the form, not to a user lookup.

`hashToPath(hash)` normalizes every shape the browser produces — `""`, `"#"`, `"#/"` all become `"/"`, and anything after `?` (the query string) is stripped.

**`index.html` — data, views, glue.** (The router code is pasted inline because pages opened from a `file://` address can't load JavaScript modules — a browser security rule.)

Routes are a data table; views are functions that take params and return DOM nodes:

```js
{ path: '/users/:id',
  view: ({ id }) => id in USERS ? [el('h1', USERS[id])] : [el('h1', 'No such user'), ...] },
```

The `el` helper builds elements with `textContent` — URL params can never execute as HTML. Note there are *two* kinds of "not found": a URL that matches no pattern (router-level 404) and a well-shaped URL naming a user who doesn't exist (app-level "no such user"). Each gets its own honest screen.

The glue is four lines: read `location.hash`, normalize it, match it, render either the view or `notFound(path)` via `replaceChildren` (which swaps in the new nodes, clearing the old). Swap hash-routing for another mechanism later and only these lines change — the matcher never knew a browser existed.

**The tests** run in Node with `node:test`. They feed `matchRoute` a fake route table (routes carry a `name` instead of a view — the matcher doesn't care) and assert: statics match, params capture any value (`/users/9999` — the original's disease, cured), multiple params work, segment counts must agree, unknown paths give `null`, static segments are case-insensitive while param *values* keep their case, `%20` decodes to a space, and first-match-wins ordering. `hashToPath` gets its own test covering every hash shape.

## 7. Words you learned (glossary)

- **Router** — code that maps the current URL to a screen.
- **SPA (single-page application)** — one HTML page that repaints instead of reloading.
- **DOM** — the browser's live object tree representing the page.
- **innerHTML / textContent** — set content as HTML / as inert plain text.
- **XSS (cross-site scripting)** — attack where user text runs as HTML/script.
- **Hash / fragment** — the part of a URL after `#`; changing it doesn't reload.
- **Event / event handler** — a browser notification / the function you register for it.
- **`addEventListener`** — modern way to register many handlers for an event.
- **Pure function** — output depends only on inputs; no DOM, no globals.
- **Node** — runs JavaScript outside a browser; where the tests run.
- **Dispatch table** — an array/map of data consulted by one generic loop, replacing branch piles.
- **Route pattern** — a path template like `/users/:id`.
- **Param** — a value captured by a `:name` segment.
- **Segment** — one piece of a path between slashes.
- **URL encoding** — how special characters travel in URLs (`%20` = space).
- **Query string** — the `?key=value` tail of a URL.
- **404** — the "nothing lives at this address" state, shown deliberately.
- **`replaceChildren`** — DOM method that swaps an element's children for new ones.
- **Glue code** — the thin layer connecting pure logic to the messy outside world.

## 8. Experiments to try on the plane (no internet needed)

Both HTML files open straight from disk, and the tests run with `node --test 60-router/refactored/` — all fully offline.

1. **Feel both failure modes.** Open each HTML file, visit `#/users/9` by editing the address bar. Original: stale old page (silent lie). Refactored: "No such user — id \"9\" isn't in the directory." Then try `#/totally/made/up`: original lies again; refactored shows a real 404 naming the path.
2. **Add a route without touching any logic.** In the refactored `index.html`, add `{ path: '/contact', view: () => [el('h1', 'Contact'), el('p', 'On a plane right now.')] }` to `ROUTES` and a matching nav link. Expected: `#/contact` just works — adding a page was adding a row.
3. **Prove ordering matters.** Add `{ path: '/users/:id' , ...}`-style overlap: insert `{ path: '/users/new', view: () => [el('h1', 'New user form')] }` *below* the `:id` route, visit `#/users/new` — you get "No such user" (the param route swallowed it). Move it *above* and it works. That's the first-match-wins rule from the tests, seen live.
4. **Try to XSS yourself — and fail.** Visit `#/users/%3Cimg%20src=x%20onerror=alert(1)%3E` (an encoded `<img onerror=...>` tag). Expected: the page just *prints* the tag text in the "No such user" message. Now, in the `el` helper only, change `textContent` to `innerHTML` and revisit — the browser tries to load a broken image (an attack would run code). Change it back and you've seen exactly what `textContent` protects against.
5. **Break a matcher rule and watch a test name it.** In `refactored/router.js`, delete the line `if (patSegs.length !== pathSegs.length) continue;` and run `node --test 60-router/refactored/`. Expected: the "segment counts must agree" test fails — `/users/7/x` now wrongly matches `/users/:id`. Restore the line; green again.
