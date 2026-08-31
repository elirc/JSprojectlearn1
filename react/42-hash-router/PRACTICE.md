# 🏋️ Practice: Hash Router

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (You can reason through all of these offline; the pages load React from a CDN, so actually clicking around needs internet once — and when a page *is* loaded, typing a hash straight into the address bar is the fastest way to test a route.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. Show me where I am (warm-up)

The nav bar looks identical on every screen, which is a small lie — the user is somewhere. Make the current section's link bold, and do it by extracting a tiny `NavLink` component that takes `href`, `active` and `children`. No new state: `App` already knows the current section.

**Practices:** deriving UI from the route, and packaging a repeated bit of markup as a component (project 01's move, applied to navigation).

**Hint:** `const [section, param] = useHashRoute();` — Home is the screen where `section` is `undefined`.

**Expected:** on `#/` the Home link is bold and Articles is normal; on `#/articles` they swap; on `#/articles/keys` the **Articles** link stays bold, because you compared `section`, not the whole route — which is how real nav bars behave on a detail page.

### ⭐⭐ 2. Predict: three hooks, one of them broken (core)

Here are three edits to `useHashRoute`, each applied on its own. For each: does navigation still work, and what exactly does the user see? Answer before reading on, then justify each answer in one sentence.

```js
// A
const [hash, setHash] = useState(window.location.hash || '#/');   // no arrow function

// B
}, [hash]);                                                       // instead of []

// C
const onHashChange = () => setHash(hash);                         // instead of window.location.hash
```

**Practices:** telling real breakage from harmless noise — lazy initializers, effect dependencies, and the stale closure of project 11.

**Hint:** for A, ask what React does with the initializer's value on the *second* render. For C, ask what `hash` is worth inside a function that was created once, on mount, and never replaced.

**Expected:** two of the three behave exactly like the original from the user's side; one leaves the address bar walking around while the page sits frozen on whatever screen it loaded with — including a frozen "back" button.

### ⭐⭐ 3. Previous and next article (core)

On an article page, add "← previous" and "next →" links to the neighbouring articles in `ARTICLES` order. They must be real `<a href="#/articles/...">` links like everything else, and the ends of the list must not render a dead link: "Why keys matter" has no previous, "Derive, don't store" has no next.

**Practices:** deriving navigation targets from data plus the route param, and conditional rendering at the edges.

**Hint:** `ARTICLES.findIndex((a) => a.id === articleId)` gives you a position; guard with `index > 0` and `index < ARTICLES.length - 1`.

**Expected:** on `#/articles/effects` you get both links, and clicking "next →" lands on `#/articles/state` with the address bar updated and browser-back returning to `effects`. On `#/articles/keys` only "next →" renders; on `#/articles/state` only "← previous". Nothing you add is a `<button>`.

### ⭐⭐ 4. Surprise me (core)

Add a "surprise me" button that jumps to a random *other* article. A button can't be an `<a>`, so this one has to navigate from JavaScript — and the temptation is to reach for the hook's `setHash`. Don't: work out what the URL would say afterwards, then navigate the only way that keeps the address bar honest. Exclude the article you're already on.

**Practices:** programmatic navigation with the URL as the single source of truth — you write to the URL and let the hook hear about it.

**Hint:** `window.location.hash = '#/articles/state';` — the browser changes the URL, records history, and fires `hashchange`, which is the same path a clicked link takes.

**Expected:** each press lands on a different article, the address bar matches the screen every time, and browser-back walks you through the ones you visited. Include the current article in the pool and you'll eventually press it and see nothing happen at all — writing the hash that's already there fires no event and adds no history entry.

### ⭐⭐⭐ 5. A real route table (challenge)

The three-line conditional ladder in `App` doesn't scale: every new screen means another line of `section === ... && param === ...`. Replace it with data. Write `matchRoute(pattern, segments)` that takes a pattern like `'/articles/:id'` plus the array from `useHashRoute()` and returns either a params object (`{ id: 'keys' }`, or `{}` for a static match) or `null`. Then declare a `ROUTES` array and let `App` find the first match, falling back to a Not-found screen.

**Practices:** turning a conditional ladder into a lookup table — the core of every router library, in about ten lines.

**Hint:** `pattern.split('/').filter(Boolean)` gives pattern parts the same shape the hook gives you. Lengths must match first; then walk the parts, collecting `:name` pieces and comparing the rest.

**Expected:** `#/` → Home, `#/articles` → the list, `#/articles/keys` → the article, `#/nonsense` and `#/articles/keys/extra` → Not found. Add `{ path: '/articles/new', ... }` *above* the `:id` route and `#/articles/new` hits it while `#/articles/keys` still resolves to the article — put it below and it never matches at all.

### ⭐⭐⭐ 6. A redirect that doesn't trap the user (challenge)

Old links point at `#/home`, which now shows Not found. Add a `Redirect` component and a route `{ path: '/home', ... }` that sends visitors to `#/`. The subtlety is history: implement it the obvious way (assign to `window.location.hash` in an effect) and press the browser's back button afterwards — reason out what happens before you try it. Then implement the version that doesn't do that.

**Practices:** push vs. replace in browser history, and which URL-writing APIs actually notify your hook.

**Hint:** `window.location.replace('#/')` navigates *without* adding a history entry. Also check `history.replaceState` against your hook's one input event before you reach for it.

**Expected:** open `#/home`, land on Home, press back once — you leave the site, because the `#/home` entry was overwritten rather than stacked. With the naive assign-to-hash version instead, back returns you to `#/home`, whose effect instantly throws you forward to `#/` again: the back button becomes unusable and the user is stuck on your site until they close the tab.

## Solutions

### 1. Show me where I am

```jsx
function NavLink({ href, active, children }) {
  return (
    <a href={href} style={{ fontWeight: active ? 'bold' : 'normal' }}>
      {children}
    </a>
  );
}

// in App, replacing the two bare <a> tags:
<nav>
  <NavLink href="#/" active={section === undefined}>Home</NavLink>
  <NavLink href="#/articles" active={section === 'articles'}>Articles</NavLink>
</nav>
```

**Why:** "which link is highlighted" is not a new fact — it's the route, read a second way, so it derives during render and stores nothing. Comparing only `section` is the deliberate choice: an article page is *inside* the Articles section, so the section link stays lit, and if you had compared the whole hash instead, the highlight would blink off the moment a user opened an article. Extracting `NavLink` costs four lines and means the next link you add can't forget the styling rule.

### 2. Predict: three hooks, one of them broken

**A works.** Dropping the arrow function only changes *when* the expression runs: React uses an initializer's value on the first render and ignores it forever after, so `window.location.hash` is read (and discarded) on every later render. Pure waste, zero behavior change — unlike replacing it with a constant `'#/'`, which really would break refresh.

**B works.** With `[hash]`, every hash change tears the listener down and puts an identical one back up. The listener reads `window.location.hash` when it fires rather than trusting anything captured, so the churn is invisible — a wasted subscribe/unsubscribe per navigation and nothing else.

**C breaks.** `onHashChange` is created once, on mount, and closes over the `hash` from that first render — `'#/'` on a normal load. Every navigation calls `setHash('#/')`, React sees the state it already has and bails out, so the screen never changes.

**Why:** the two "broken-looking" edits are noise and the innocent-looking one is fatal, which is the point. A listener registered once with `[]` deps keeps the variables of the render that created it forever — the stale closure of project 11 — so the only safe thing for it to read is the outside world it's supposed to be syncing with, `window.location.hash`, which is always current. Under C the address bar and history still work perfectly (they're the browser's, not yours); it's React's copy that has quietly stopped listening, so back and forward look dead too.

### 3. Previous and next article

```jsx
function ArticlePage({ articleId }) {
  const index = ARTICLES.findIndex((a) => a.id === articleId);
  if (index === -1) return <h1>Not found</h1>;

  const article = ARTICLES[index];
  const prev = index > 0 ? ARTICLES[index - 1] : null;
  const next = index < ARTICLES.length - 1 ? ARTICLES[index + 1] : null;

  return (
    <div>
      <h1>{article.title}</h1>
      <p>Imagine profound content here.</p>
      <p>
        {prev && <a href={`#/articles/${prev.id}`}>← {prev.title}</a>}
        {prev && next && ' · '}
        {next && <a href={`#/articles/${next.id}`}>{next.title} →</a>}
      </p>
      <a href="#/articles">back</a>
    </div>
  );
}
```

**Why:** `findIndex` does double duty — it validates the URL (`-1` means someone typed nonsense, so the Not-found guard still fires first) and it gives the position the neighbours are computed from. Both links are ordinary anchors, so they inherit history, new-tab and copy-link for free, and the `prev &&` guards render nothing rather than a link to `undefined`. Everything here is derived from `ARTICLES` and the route param, so adding a fourth article to the data array wires it into the chain automatically.

### 4. Surprise me

```jsx
function SurpriseMe() {
  const [, param] = useHashRoute();
  const others = ARTICLES.filter((a) => a.id !== param);

  function go() {
    const pick = others[Math.floor(Math.random() * others.length)];
    window.location.hash = `#/articles/${pick.id}`;
  }

  return <button onClick={go}>surprise me</button>;
}
```

**Why:** `setHash` would move React's copy of the location while the address bar stayed put, and the two would disagree until the next real `hashchange` — refresh and share would then hand out the *old* URL, which is precisely the bug this project exists to kill. Writing `window.location.hash` instead goes the long way round on purpose: browser updates the URL → browser records history → browser fires `hashchange` → the hook updates → React re-renders. Filtering out the current article matters because assigning the hash you already have is a genuine no-op — no event, no history entry, no re-render — so a "random" pick that lands on the current page would look like a broken button. Calling `useHashRoute()` a second time here is fine: each caller keeps its own state copy, and the shared `hashchange` event keeps them in step.

### 5. A real route table

```jsx
function matchRoute(pattern, segments) {
  const parts = pattern.split('/').filter(Boolean);
  if (parts.length !== segments.length) return null;

  const params = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(':')) params[parts[i].slice(1)] = segments[i];
    else if (parts[i] !== segments[i]) return null;
  }
  return params;
}

const ROUTES = [
  { path: '/', render: () => <HomePage /> },
  { path: '/articles', render: () => <ArticlesPage /> },
  { path: '/articles/:id', render: (params) => <ArticlePage articleId={params.id} /> },
];

function App() {
  const segments = useHashRoute();
  const hit = ROUTES
    .map((route) => ({ route, params: matchRoute(route.path, segments) }))
    .find((candidate) => candidate.params !== null);

  return (
    <div>
      <nav>
        <NavLink href="#/" active={segments.length === 0}>Home</NavLink>
        <NavLink href="#/articles" active={segments[0] === 'articles'}>Articles</NavLink>
      </nav>
      {hit ? hit.route.render(hit.params) : <h1>Not found</h1>}
    </div>
  );
}
```

**Why:** the ladder asked "is it this screen? is it that one?" once per screen; the table asks "which pattern fits?" once, so new screens are new *data*. The length check first is what makes `#/articles/keys/extra` fall through to Not found instead of quietly matching `/articles/:id`, and the `params !== null` test is deliberate — a static route matches with `{}`, which is truthy, but writing the comparison out loud keeps that from looking like an accident. Order is the router's one piece of hidden state: `find` takes the first hit, so a literal `/articles/new` must sit above `/articles/:id`, which would otherwise happily match with `id: 'new'`. React Router does exactly this, plus nested routes and a specificity ranking so order matters less.

### 6. A redirect that doesn't trap the user

```jsx
function Redirect({ to }) {
  useEffect(() => {
    window.location.replace(`#${to}`);
  }, [to]);
  return <p>Redirecting…</p>;
}

// in ROUTES, above the catch-all behaviour:
{ path: '/home', render: () => <Redirect to="/" /> },
```

**Why:** `window.location.hash = '#/'` *pushes* a history entry, so the stack reads `… → #/home → #/`; back moves to `#/home`, whose effect fires again and pushes `#/` back on top, and the user is bounced forward forever — a real bug pattern in hand-rolled routers. `location.replace` performs the same fragment navigation but overwrites the current entry, so `#/home` never survives to be returned to, and back leaves the site as it should. The redirect belongs in an effect because navigating is a side effect on the outside world, not something a render may do. And resist `history.replaceState('', '', '#/')`: it edits the URL without firing `hashchange`, so your hook would never hear it and the screen would still say "Redirecting…" — the URL and React would be out of sync, which is the disease, not the cure.
