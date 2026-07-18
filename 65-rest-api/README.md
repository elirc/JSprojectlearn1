# 65 — REST API (a micro-Express from scratch)

**Lesson: what Express actually is — a route table, a middleware onion, and
one error boundary — plus the routes → service → repo layering every real
backend settles into.**

## Run it

```
node 65-rest-api/original.js            # then: curl it (see its output)
node 65-rest-api/refactored/server.js
node --test 65-rest-api/
```

The tests are *real* integration tests: the app listens on an OS-assigned
port (`listen(0)`) and the suite speaks actual HTTP via `fetch`.

## What's wrong with the original?

1. **Routing is string surgery in an if/else ladder** — path params are
   `split("/")[2]` and hope.
2. **Body parsing is re-rolled per route**, each copy slightly different.
3. **`JSON.parse` with no try/catch: one bad client crashes the process
   for everyone.** (The tests send `{oops` at the refactor and then prove
   the server still answers.)
4. **No validation** — `{}`, `{"title": ""}`, `{"title": 12345}` all
   become permanent data.
5. **Error responses are improvised per site** (`"nope"` in text/plain
   here, JSON there, nothing elsewhere) — clients can't rely on any shape.
6. **Business rules are smeared through HTTP plumbing** — you can't test
   "todos" without booting a server.

## What changed in the refactor

- **`app.js` is the whole framework, ~80 lines**: a route *table* matched
  by **project 60's `matchRoute` — the identical pure function that drove
  a browser SPA now drives a server** (URLs don't care which side parses
  them); a middleware **onion** of `async (ctx, next)` built by function
  composition; and **one error boundary** — handlers throw (`HttpError`
  for intentional statuses), one catch converts everything to consistent
  `{ error }` JSON. 500s log the real error and leak nothing.
- **`jsonBody()` middleware**: body parsing written once — malformed JSON
  is a 400 *for that client*, with a size limit thrown in (413).
- **Three layers in `todos.js`**: `repo` knows storage and no rules;
  `service` knows the rules (valid titles, what ids mean, what "not
  found" is) and no HTTP; `routes` translate — thin enough that nothing
  can hide in them. Swap the Map repo for a database and the service
  never hears about it.
- **`server.js` is a composition root** that only `listen`s when run
  directly — which is exactly what makes the integration tests possible.

## Key takeaway

"Routes → services → repos" is the backend's version of decide-vs-do:
HTTP translation, business decisions, and storage each in their own layer.
And the errors rule is worth tattooing somewhere: *throw typed errors
anywhere, convert to transport format in exactly one place.* Every
framework you'll ever use is these three ideas with more edge cases.
