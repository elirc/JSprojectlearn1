# 🏋️ Practice: REST API (a micro-Express from scratch)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Clear the list — one feature, three layers (warm-up)

Add `DELETE /todos` (no id — the whole collection) by touching all three layers in `todos.js`: a `clear()` on the repo, a `removeAll()` on the service, and a one-liner route. Check with the server running: `curl -X DELETE localhost:3000/todos` answers 204, and `curl localhost:3000/todos` then returns `[]`. Note that the route table happily holds both `DELETE /todos` and `DELETE /todos/:id` — the matcher separates them by segment count.

What it practices: walking a new feature through repo → service → route, each layer staying ignorant of the ones above.

Hint: the repo's rows live in a `Map` — `Map` has a built-in `.clear()`.

### ⭐⭐ 2. Filter with a query parameter (core)

Support `GET /todos?done=true` and `?done=false`. The *rule* belongs in the service: extend `list` to take `{ done }`, where `done` must be `undefined`, `'true'`, or `'false'` — anything else throws `HttpError(400, 'done must be "true" or "false"')`. The route passes `ctx.query.get('done') ?? undefined` (careful: `URLSearchParams.get` returns `null` for a missing key). Check: with one open and one done todo, `?done=true` returns only the done one, no query returns both, and `?done=maybe` returns status 400 with the exact `{ error }` shape.

What it practices: query-string input is input too — validate it in the service, not in the route.

Hint: after validating, `all.filter((t) => t.done === (done === 'true'))`.

### ⭐⭐ 3. A requireJson middleware (core)

Write a middleware `requireJson()` that rejects any POST or PUT whose `Content-Type` header doesn't contain `application/json`, by throwing `HttpError(415, 'Content-Type must be application/json')` — before `jsonBody()` ever reads the stream. Register it with `app.use(requireJson())` *above* `app.use(jsonBody())` in `buildApp`. Check: a POST with `Content-Type: text/plain` (or none) gets a 415 JSON error, a normal JSON POST still gets 201, and GETs are untouched.

What it practices: writing a new onion layer — shared policy declared once, and middleware order mattering.

Hint: same shape as `jsonBody`: `(ctx, next) => { ...checks...; return next(ctx); }`; the header is `ctx.req.headers['content-type']`.

### ⭐⭐ 4. Pin two uncovered edges with tests (core)

`api.test.js` never asks these two questions — add them as new tests. First: a `PUT /todos/:id` with body `{}` on an existing todo (no `title`, no `done`) must answer 200 and return the todo *unchanged* — the service builds an empty `fields` object and the repo's spread-merge changes nothing. Second: a title of *exactly* 200 characters must be accepted with 201 (the existing test only proves 201 characters is rejected — boundaries deserve their own test).

What it practices: reading validation code closely enough to spot the untested boundary, then pinning it.

Hint: fetch the todo before the empty PUT and `assert.deepEqual` it against the PUT's response body.

### ⭐⭐⭐ 5. 405 Method Not Allowed (challenge)

Real frameworks distinguish "no such path" (404) from "right path, wrong verb" (405). In `app.js`, the no-match branch currently always throws 404 — change it: if any route of a *different* method matches `ctx.path`, respond 405 with an `Allow` header listing those methods (e.g. `Allow: PUT, DELETE`), else keep the 404. Check: `POST /todos/1` → 405 with `Allow: PUT, DELETE`; `PUT /todos` → 405 with `Allow: GET, POST`; `GET /no/such/route` → still a plain 404 with no `Allow` header; normal requests unaffected.

What it practices: extending the framework itself — the route table is data, so "which methods work here?" is just another query over it.

Hint: `matchRoute([r], ctx.path)` tests a single route against the path; set the header with `ctx.res.setHeader('Allow', ...)` before throwing — `writeHead` in `ctx.json` merges headers set earlier.

## Solutions

### 1. Clear the list

```js
// repo — knows storage, no rules:
clear: () => rows.clear(),

// service — the "rule" here is just delegation:
removeAll() { repo.clear(); },

// routes:
app.delete('/todos', (ctx) => { service.removeAll(); ctx.json(204, null); });
```

WHY: Each layer gains one small, honest method: the repo touches its `Map`, the service exposes the operation without knowing HTTP, and the route translates. `matchRoute` compares segment counts before anything else, so `/todos` (one segment) can never be swallowed by `/todos/:id` (two) — the table stays unambiguous as it grows, which is exactly what the original's if/else ladder couldn't promise.

### 2. `?done=` filter

```js
// service:
list({ done } = {}) {
  if (done !== undefined && done !== 'true' && done !== 'false') {
    throw new HttpError(400, 'done must be "true" or "false"');
  }
  const all = repo.all();
  return done === undefined ? all : all.filter((t) => t.done === (done === 'true'));
},

// route:
app.get('/todos', (ctx) =>
  ctx.json(200, service.list({ done: ctx.query.get('done') ?? undefined })));
```

WHY: Query strings are user input arriving as *strings* — `'true'` is not `true` — so the service states exactly what it accepts and rejects the rest through the same `HttpError` path as body validation, keeping every error in the one `{ error }` shape. The `?? undefined` in the route is pure translation: converting `URLSearchParams`' `null`-for-missing into the service's `undefined`-for-absent vocabulary.

### 3. requireJson middleware

```js
export function requireJson() {
  return (ctx, next) => {
    if (ctx.method === 'POST' || ctx.method === 'PUT') {
      const type = ctx.req.headers['content-type'] ?? '';
      if (!type.includes('application/json')) {
        throw new HttpError(415, 'Content-Type must be application/json');
      }
    }
    return next(ctx);
  };
}

// in buildApp — order matters:
app.use(requireJson());
app.use(jsonBody());
```

WHY: This is the onion earning its keep: a cross-cutting policy written once, applied to every route, and *ordered* — by sitting outside `jsonBody`, it rejects mislabeled requests before any body bytes are read. Throwing `HttpError` means the error boundary formats the 415 exactly like every other failure; the middleware never touches `res` itself.

### 4. The two edge tests

```js
test('PUT with an empty body is a valid no-op update', async () => {
  const { id } = await (await post('/todos', { title: 'unchanged' })).json();
  const before = (await (await fetch(`${base}/todos`)).json()).find((t) => t.id === id);
  const res = await put(`/todos/${id}`, {});
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), before);
});

test('a title of exactly 200 chars sits inside the boundary', async () => {
  const res = await post('/todos', { title: 'x'.repeat(200) });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).title.length, 200);
});
```

WHY: `update` only adds fields the client actually sent, so `{}` legitimately means "change nothing" — a test makes that a promise instead of an accident. And validation bugs live at boundaries: the suite proved 201 fails but never that 200 succeeds, so an off-by-one edit (`>=` for `>`) would have passed every existing test while rejecting legal input.

### 5. 405 Method Not Allowed

```js
// in app.js, replacing the 404-only branch:
const endpoint = match
  ? match.route.handler
  : () => {
      const allowed = [...new Set(
        routes.filter((r) => r.method !== ctx.method && matchRoute([r], ctx.path))
              .map((r) => r.method))];
      if (allowed.length > 0) {
        ctx.res.setHeader('Allow', allowed.join(', '));
        throw new HttpError(405, `Method ${ctx.method} not allowed on ${ctx.path}`);
      }
      throw new HttpError(404, `No route: ${ctx.method} ${ctx.path}`);
    };
```

WHY: Because routes are a *table*, "does this path exist under another verb?" is one `filter` over data — in the original's if/else ladder this feature would mean re-reading every branch. The `Allow` header is set on the raw response before the throw; the error boundary's `ctx.json` call uses `writeHead`, which merges previously set headers, so the header survives the normal error path. Both failures still flow through the single boundary: one place decides what 404 and 405 look like on the wire.
