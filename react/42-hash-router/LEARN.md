# 📘 Learning Guide: Hash Router

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny three-screen website: a Home page ("Welcome!"), an Articles page
listing three article titles, and an Article page showing one article.
A nav bar at the top switches between Home and Articles; clicking a
title opens that article; "back" returns to the list.

Both versions look identical. The difference shows in the **address
bar** and the **browser buttons**: in the original, refreshing the page
dumps you back to Home and the browser's back button exits the site
entirely. In the refactor, the address bar reads something like
`#/articles/keys`, refresh keeps your place, back/forward walk between
screens, and you could send the URL to a friend.

## 2. Concepts you need first

### What a URL is made of (and the hash)

A URL like `https://site.com/page.html#/articles/keys` has parts. The
piece after the `#` is the **hash** (also called the fragment). Two
special properties make it perfect for this trick:

- Changing the hash does **not** reload the page.
- But the browser still treats each hash as a *place*: it goes into
  history (back/forward work), it survives refresh, and it's part of
  the URL you copy.

JavaScript can read it as `window.location.hash` (a string like
`"#/articles/keys"`) and the browser fires a `hashchange` event
whenever it changes.

### Routing (URLs deciding what renders)

**Routing** is the mapping from a URL to a screen. A **router** is the
code that reads the current URL, and picks which component to show.
A **route** is one such mapping, e.g. `#/articles/keys` → the Article
page for the article with id "keys". "Hash routing" just means the
routes live in the hash part of the URL.

### Browser events and addEventListener

The browser announces things by firing **events**. You listen with
`addEventListener(name, fn)` and stop listening with
`removeEventListener(name, fn)` (must be the *same* function object):

```js
const onChange = () => console.log('hash is now', window.location.hash);
window.addEventListener('hashchange', onChange);
// later, when done:
window.removeEventListener('hashchange', onChange);
```

### useEffect with cleanup (syncing with the outside world)

`useEffect(fn, [])` runs `fn` once after the component first appears
(**mounts**). If `fn` returns a function, React calls that returned
function when the component is removed (**unmounts**) — the
**cleanup**. Subscribing in the effect and unsubscribing in the cleanup
is THE pattern for listening to browser events without leaks (project
18's lesson):

```js
useEffect(() => {
  window.addEventListener('hashchange', onHashChange);
  return () => window.removeEventListener('hashchange', onHashChange);
}, []);
```

The deeper rule (project 21): effects exist to *synchronize* React with
things outside React. Here the outside thing is the address bar.

### Lazy initial state

`useState(() => expensiveRead())` — passing a *function* — tells React
"call this only once, on the very first render, to get the starting
value." Here it reads the hash that's already in the address bar when
the page loads, so a refreshed page starts on the right screen:

```js
const [hash, setHash] = useState(() => window.location.hash || '#/');
```

### Parsing a string into pieces

`'#/articles/keys'.replace(/^#\//, '')` strips the leading `#/` (that
`/^#\//` is a **regular expression** — a pattern; `^` means "at the
start"). Then `.split('/')` cuts the rest at each slash into an array:
`['articles', 'keys']`. `.filter(Boolean)` drops empty strings (so
`'#/'` parses to `[]`, not `['']`).

### Links vs onClick

`<a href="#/articles">` is a plain link. Clicking it makes the browser
change the hash itself — no JavaScript handler needed. Compare the
original's `<a href="#" onClick={e => { e.preventDefault(); ... }}>`:
`preventDefault()` cancels the browser's normal link behavior so the
code can fake it with state. Real links get browser superpowers for
free: open-in-new-tab, middle-click, copy-link-address.

### Optional chaining (`?.`)

`ARTICLES.find(...)?.title` — the `?.` means "if the left side is
`undefined` or `null`, stop and give `undefined` instead of crashing."
Used in the original when an article might not be found.

## 3. Walking through the original code

The data: three articles, each with an `id` and `title`. Then the
"routing" — two pieces of ordinary state:

```js
const [view, setView] = useState('home');   // 'home' | 'articles' | 'article'
const [articleId, setArticleId] = useState(null);

function openArticle(id) {
  setArticleId(id);
  setView('article');
}
```

`view` says which screen shows; `articleId` says which article, when
relevant. The nav is buttons that set state:

```js
<button onClick={() => setView('home')}>Home</button>
<button onClick={() => setView('articles')}>Articles</button>
```

Rendering is a conditional ladder — each screen shows only when `view`
matches:

```js
{view === 'home' && <h1>Welcome!</h1>}
{view === 'articles' && ( ...the list... )}
{view === 'article' && ( ...one article... )}
```

The article links are fake links:

```js
<a href="#" onClick={(e) => { e.preventDefault(); openArticle(a.id); }}>
  {a.title}
</a>
```

`href="#"` makes it *look* like a link; `preventDefault()` stops the
browser from acting on it; the handler sets state instead. The article
screen finds its article with
`ARTICLES.find((a) => a.id === articleId)?.title`.

## 4. What's wrong with it (in beginner terms)

The core mistake: **which screen you're on is stored in `useState`**,
and `useState` lives only inside the running page. Three broken user
expectations follow directly.

**1. Refresh forgets where you were.** Navigate to an article, press
F5. The page reloads, React starts fresh, `useState('home')` runs
again — you're on Home. Your place existed only in memory, and the
memory was wiped.

**2. Back/forward don't work.** Go Home → Articles → an article, then
press the browser's back button. You'd expect the article list. What
actually happens: you leave the site entirely (back to whatever page
you came from). The browser never heard about these "pages" — to it,
you've been on one single page the whole time.

**3. No shareable links.** Try to send a friend a link to "Why keys
matter". You can't. The address bar reads exactly the same on every
screen. Bookmarks are equally useless.

The subtle distinction the README draws: project 16 stored a wizard's
current *step* in state, and that was correct — a half-finished wizard
step is *transient* (temporary, not worth an address). But screens the
user thinks of as **places** — pages, tabs, selected items — deserve
addresses. The bug isn't the pattern; it's applying it to the wrong
kind of state.

## 5. Try it yourself first!

1. **Vague:** the browser already knows how to remember places,
   walk back/forward, and share them. What browser feature carries
   "where am I" inside the URL without reloading the page?
2. **Warmer:** the hash. Make navigation write to it: replace nav
   buttons with plain `<a href="#/articles">` links. Watch the address
   bar change as you click.
3. **Warmer still:** now make React *read* it. Write a hook that keeps
   `window.location.hash` in state: initialize with a lazy read,
   subscribe to the `hashchange` event in a `useEffect`, and remove
   the listener in the cleanup.
4. **Parsing:** turn `'#/articles/keys'` into `['articles', 'keys']`
   (strip `#/`, split on `/`). Let App pick the screen from those
   pieces instead of from `view`/`articleId`.
5. **Don't forget bad input:** what should `#/articles/nonsense`
   show? A URL is user input — someone can type anything.

## 6. Understanding the refactored solution

**The hook — `useHashRoute()` — is the whole router:**

```js
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return hash.replace(/^#\//, '').split('/').filter(Boolean);
}
```

Piece by piece:
- **Lazy initial read** — a refreshed or freshly-shared page starts on
  the URL's screen, because the first render already reads the hash.
  `|| '#/'` covers a page opened with no hash at all.
- **Subscribe + cleanup** — when the user clicks a link or presses
  back/forward, the browser changes the hash and fires `hashchange`;
  the listener copies the new value into state, which re-renders.
  The cleanup prevents leaked listeners if the component unmounts.
- **Parse on the way out** — components get tidy pieces
  (`['articles', 'keys']`), not a raw string to pick apart.

Notice the direction of truth: the **URL is the source of truth**, and
React state is just a synchronized copy of it. Navigation never calls
`setHash` directly — it changes the URL, and the hook *hears* it.

**Navigation became plain links:**

```js
<li key={a.id}><a href={`#/articles/${a.id}`}>{a.title}</a></li>
```

No onClick, no preventDefault, no state setter. The browser updates
the hash, records history, supports new-tab and copy-link — decades of
browser behavior, rented for free.

**App is a route table:**

```js
const [section, param] = useHashRoute();

{section === undefined && <HomePage />}
{section === 'articles' && param === undefined && <ArticlesPage />}
{section === 'articles' && param !== undefined && <ArticlePage articleId={param} />}
```

`#/` parses to `[]` so both pieces are `undefined` → Home.
`#/articles` → `['articles']` → the list. `#/articles/keys` →
`['articles', 'keys']` → one article.

**Bad URLs get a page, not a crash:**

```js
const article = ARTICLES.find((a) => a.id === articleId);
if (!article) return <h1>Not found</h1>;
```

A URL is input anyone can type; input gets validated. `#/articles/zzz`
shows "Not found" instead of an empty broken page.

**Real-world note:** production apps use a library (React Router) and
`history.pushState`, which allows clean paths like `/articles/keys`
without the `#`. Same architecture — URL⇄state sync plus route
matching — just more machinery. The hash version is the same idea,
small enough to fully own.

## 7. Words you learned (glossary)

- **URL:** the full address in the browser's address bar.
- **Hash / fragment:** the part of a URL after `#`; changing it never
  reloads the page but does create a history entry.
- **Routing:** deciding what to show based on the URL.
- **Route:** one URL-pattern-to-screen mapping.
- **Router:** the code that reads the URL and picks the screen.
- **hashchange:** the browser event fired when the hash changes.
- **Event listener:** a function registered to run when an event fires.
- **Mount / unmount:** a component appearing in / being removed from
  the page.
- **Cleanup function:** the function an effect returns; React runs it
  on unmount to undo the effect (e.g., remove a listener).
- **Lazy initial state:** `useState(() => ...)` — compute the starting
  value once, on first render only.
- **Source of truth:** the one place a value authoritatively lives;
  everything else syncs from it.
- **Parsing:** turning a raw string into structured pieces.
- **Regular expression:** a pattern for matching text, like `/^#\//`.
- **preventDefault():** cancels the browser's built-in response to an
  event (e.g., following a link).
- **Optional chaining (`?.`):** safely access a property that might
  not exist, yielding `undefined` instead of crashing.
- **Transient state:** temporary UI state not worth an address (like a
  wizard step) — fine in `useState`.

## 8. Experiments to try on the plane (no internet needed)

You can edit and reason offline; the pages load React from a CDN
(shared library servers), so actually running them needs internet on
first load. Handy trick if the page IS loaded: you can type hashes
straight into the address bar to test routes without any clicking.

1. **Type a garbage URL.** With the refactor open, put
   `#/articles/banana` in the address bar. Expected: the "Not found"
   page. Delete the `if (!article)` guard and try again — expected: a
   crash or blank article, which is why URLs get validated.
2. **Add an About page.** Create `function AboutPage()`, add
   `<a href="#/about">About</a>` to the nav, and one route line:
   `{section === 'about' && <AboutPage />}`. Expected: it works, gets
   its own address, survives F5, and appears in back/forward history —
   three features you didn't write.
3. **Break the sync.** Remove the `useEffect` (keep the lazy initial
   read). Expected: the first screen is right, but clicking links
   changes the address bar while the page ignores it — the URL moved
   and nobody told React. Back/forward also appear dead.
4. **Watch the initial read work.** In the refactor, navigate to an
   article, then press F5. Expected: same article. Now change the
   `useState(() => ...)` initializer to plain `useState('#/')` and
   refresh again — expected: dumped to Home, the original's bug
   half-returned.
5. **Deep-link state.** Make the hash carry something extra, like
   `#/articles/keys/big`, and render the title larger when the third
   piece is `'big'`. Expected: font size now survives refresh and
   lives in a shareable link — you've made a *view preference* into a
   place. Then ask yourself: should it be? (The README's closing
   question: does a user expect this to survive refresh?)
