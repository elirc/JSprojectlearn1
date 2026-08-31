# 🏋️ Practice: Client-Side Router

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Put your code in a scratch file (e.g. `practice.test.js`) inside `refactored/`, import from `./router.js`, and run `node --test 60-router/refactored/practice.test.js`. Reuse the test file's route table:

```js
const routes = [
  { path: '/', name: 'home' },
  { path: '/users', name: 'users' },
  { path: '/users/:id', name: 'user' },
  { path: '/about', name: 'about' },
];
```

## Exercises

### ⭐ 1. Tests for sloppy paths (warm-up)
`matchRoute` is more forgiving than its test file proves. Write three new tests asserting: `/users/7/` (trailing slash) matches `user` with `{ id: '7' }`; `//users//7` (doubled slashes) also matches `user`; and `/users/a%2Fb` (an *encoded* slash inside a param) matches with `{ id: 'a/b' }`. All three should pass with no code changes — your job is to pin down *why*.
What it practices: reading code well enough to predict edge behavior, then locking it in with tests.
Hint: `.split('/').filter(Boolean)` — what does `filter(Boolean)` do to empty segments, and why does `%2F` survive the split?

### ⭐⭐ 2. `pathFor` — reverse routing (core)
Write `pathFor(pattern, params)`: the opposite of matching. `pathFor('/users/:id', { id: 'ada lovelace' })` returns `'/users/ada%20lovelace'`; `pathFor('/about')` returns `'/about'`; a missing param throws an `Error` naming it. Round-trip check: feeding the result back through `matchRoute` must recover `{ id: 'ada lovelace' }`.
What it practices: building links from the same route table the matcher uses — one source of truth for URLs.
Hint: split/filter like `compile` does, then `encodeURIComponent` each param value (the mirror image of the matcher's `decodeURIComponent`).

### ⭐⭐ 3. `parseQuery` (core)
`hashToPath` throws the query string away. Write `parseQuery(hash)` that keeps it: `parseQuery('#/users?sort=name&dir=asc')` returns `{ sort: 'name', dir: 'asc' }`; no `?` returns `{}`; values are URL-decoded (`'#/search?q=ada%20lovelace'` → `{ q: 'ada lovelace' }`); a bare key (`'#/x?flag'`) gets the value `''`.
What it practices: the same normalize-messy-browser-input job `hashToPath` does, one layer deeper.
Hint: `hash.split('?')[1]`, then split on `&`, then on `=` — destructuring with a default (`const [k, v = ''] = ...`) handles bare keys.

### ⭐⭐ 4. A wildcard tail: `/files/*` (core)
Write `matchRouteWild(routes, path)` (copy `matchRoute` as your starting point) that additionally supports `*` as the *last* pattern segment, matching all remaining segments. `/files/*` must match `/files/a/b/c.txt` with `params['*'] === 'a/b/c.txt'`, and `/files` alone with `params['*'] === ''`. Non-wildcard routes must behave exactly as before, and `/nope` still returns `null`.
What it practices: extending a matcher without breaking its existing contract (segment counts, params, first-match-wins).
Hint: if the last compiled segment is `'*'`, the length rule relaxes from `!==` to `pathSegs.length >= fixed.length`, where `fixed` is the pattern minus the `*`.

### ⭐⭐⭐ 5. `matchBest` — specificity instead of order (challenge)
In `matchRoute`, putting `/users/:id` *above* `/users/new` silently steals the form page. Write `matchBest(routes, path)` that makes table order irrelevant: among all routes that match, return the one with the most *static* (non-param) segments. Expected, with the table ordered `['/users/:id', '/users/new']` deliberately wrong: `matchRoute` returns `user` for `/users/new`, but `matchBest` returns `new-user-form`; `/users/7` still returns `user` with `{ id: '7' }`; `/users/7/x` still returns `null`.
What it practices: turning an ordering rule ("first match wins") into a scoring rule — how real routers rank routes.
Hint: don't `return` on the first survivor; give each survivor a score (+1 per static segment that matched) and keep the best. Ties: keep the earliest.

## Solutions

### 1. Sloppy-path tests
```js
test('trailing and doubled slashes are tolerated', () => {
  assert.deepEqual(matchRoute(routes, '/users/7/').params, { id: '7' });
  assert.equal(matchRoute(routes, '//users//7').route.name, 'user');
});
test('an encoded slash hides inside ONE param', () => {
  assert.deepEqual(matchRoute(routes, '/users/a%2Fb').params, { id: 'a/b' });
});
```
WHY: `filter(Boolean)` drops the empty strings that trailing/doubled slashes produce, so both sides normalize to the same segment list. `%2F` is not a real `/`, so `split('/')` leaves it inside one segment — and `decodeURIComponent` only unpacks it *after* segmentation. That ordering (split first, decode second) is a real router-design decision, now pinned by tests.

### 2. `pathFor`
```js
export function pathFor(pattern, params = {}) {
  const segs = pattern
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      if (!seg.startsWith(':')) return seg;
      const name = seg.slice(1);
      if (!(name in params)) throw new Error(`pathFor: missing param "${name}"`);
      return encodeURIComponent(params[name]);
    });
  return '/' + segs.join('/');
}
```
WHY: Hand-writing hrefs re-creates the original's disease (strings that drift out of sync with routes). Generating them from the same patterns keeps one source of truth, and `encodeURIComponent`/`decodeURIComponent` form a round trip the test proves. Throwing on a missing param is fail-loudly at the boundary.

### 3. `parseQuery`
```js
export function parseQuery(hash) {
  const query = hash.split('?')[1];
  if (!query) return {};
  const out = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [key, value = ''] = pair.split('=');
    out[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return out;
}
```
WHY: Like `hashToPath`, this is a pure normalizer for every shape the browser can hand you — no `window`, so it's Node-testable. The `value = ''` default makes bare flags well-defined instead of `undefined`, and decoding happens once, at the boundary, like the matcher's param decoding.

### 4. `matchRouteWild`
```js
export function matchRouteWild(routes, path) {
  const pathSegs = path.split('/').filter(Boolean);
  for (const route of routes) {
    const patSegs = route.path
      .split('/')
      .filter(Boolean)
      .map((seg) => (seg.startsWith(':') ? { param: seg.slice(1) } : seg.toLowerCase()));
    const wild = patSegs.at(-1) === '*';
    const fixed = wild ? patSegs.slice(0, -1) : patSegs;
    if (wild ? pathSegs.length < fixed.length : pathSegs.length !== fixed.length) continue;

    const params = {};
    let ok = true;
    for (let i = 0; i < fixed.length; i++) {
      const pat = fixed[i];
      if (typeof pat === 'object') params[pat.param] = decodeURIComponent(pathSegs[i]);
      else if (pat !== pathSegs[i].toLowerCase()) { ok = false; break; }
    }
    if (!ok) continue;
    if (wild) params['*'] = pathSegs.slice(fixed.length).map(decodeURIComponent).join('/');
    return { route, params };
  }
  return null;
}
```
WHY: The only rule that changes is the length check — everything else (compile, case rules, decoding, first-match-wins) is preserved, which is what "extend without breaking the contract" means. The wildcard capture decodes each segment but keeps the `/` separators, so `a%2Fb` and `a/b` stay distinguishable upstream.

### 5. `matchBest`
```js
export function matchBest(routes, path) {
  const pathSegs = path.split('/').filter(Boolean);
  let best = null;
  let bestScore = -1;
  for (const route of routes) {
    const patSegs = route.path
      .split('/')
      .filter(Boolean)
      .map((seg) => (seg.startsWith(':') ? { param: seg.slice(1) } : seg.toLowerCase()));
    if (patSegs.length !== pathSegs.length) continue;

    const params = {};
    let ok = true;
    let score = 0;
    for (let i = 0; i < patSegs.length; i++) {
      const pat = patSegs[i];
      if (typeof pat === 'object') params[pat.param] = decodeURIComponent(pathSegs[i]);
      else if (pat === pathSegs[i].toLowerCase()) score += 1;
      else { ok = false; break; }
    }
    if (ok && score > bestScore) { best = { route, params }; bestScore = score; }
  }
  return best;
}
```
WHY: First-match-wins makes route order load-bearing — a data-entry mistake becomes a routing bug. Scoring static segments makes `/users/new` (2 static) beat `/users/:id` (1 static) no matter where each sits in the table; `>` (not `>=`) keeps the earliest route on ties, so behavior stays deterministic. This is exactly how production routers rank candidates. (Verified by running it under Node with the table deliberately mis-ordered.)
