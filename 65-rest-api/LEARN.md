# 📘 Learning Guide: REST API (a micro-Express from scratch)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny web server that stores a to-do list in memory. Other programs (or you, using a command-line tool) talk to it over the network:

- Ask "give me all todos" → it answers with a list like `[{"id":1,"title":"buy milk","done":false}]`
- Send "create a todo called buy milk" → it stores it and answers with the new todo
- Send "mark todo 1 as done" → it updates it
- Send "delete todo 1" → it removes it

There is no web page here. The server only speaks in data (JSON). This kind of data-only server is called an **API** (Application Programming Interface) — an interface for *programs* instead of people. It runs entirely on your machine, so it works fine offline on the plane.

## 2. Concepts you need first

**A server** is just a program that waits. It sits there listening on a "port" (a numbered door on your computer, like 3000), and every time a request knocks, it runs a function and sends back a response.

**HTTP** is the language of that knock. Every HTTP request has:
- a **method** — a verb: `GET` (read), `POST` (create), `PUT` (update), `DELETE` (remove)
- a **path** — which thing you want: `/todos` or `/todos/7`
- optionally a **body** — data you're sending, like `{"title":"buy milk"}`

Every response has a **status code** (a 3-digit number: 200 = OK, 201 = created, 400 = your request was bad, 404 = not found, 500 = the server broke) and usually a body.

**REST** is a naming convention: use the HTTP verbs on noun-shaped paths. `GET /todos` lists, `POST /todos` creates, `PUT /todos/7` updates todo 7. Nothing magic — just a shared habit so APIs feel familiar.

**JSON** (JavaScript Object Notation) is text that describes data: `{"title":"hi","done":false}`. Programs convert between JSON text and real objects:

```js
const text = '{"title":"hi"}';
const obj = JSON.parse(text);       // text -> object
console.log(obj.title);             // "hi"
console.log(JSON.stringify(obj));   // object -> text: {"title":"hi"}
```

Careful: `JSON.parse` **throws an error** (crashes, unless caught) if the text is broken, e.g. `JSON.parse("{oops")`.

**Node's built-in http module** lets you build a server in a few lines. This works with zero internet:

```js
import http from "node:http";
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("hello");           // every visit gets "hello"
});
server.listen(3000);          // now visit http://localhost:3000
```

`req` is the incoming request, `res` is your reply. `localhost` means "this same computer."

**Streams and chunks.** The body of a request doesn't arrive all at once — it dribbles in as **chunks** (pieces of bytes, called Buffers in Node). You collect them, then glue them together:

```js
const chunks = [];
req.on("data", (c) => chunks.push(c));            // a piece arrived
req.on("end", () => {                             // no more pieces
  console.log(Buffer.concat(chunks).toString());  // the whole body
});
```

**try/catch** catches errors instead of letting them crash the program:

```js
try {
  JSON.parse("{oops");
} catch (err) {
  console.log("bad JSON, but I'm still alive");
}
```

**throw** creates an error on purpose: `throw new Error("no!")` stops the current function and travels *up* through every caller until some `try/catch` catches it. You can make your own error types with `class HttpError extends Error { ... }` — same behavior, plus extra fields like a status code.

**Middleware** is a function that runs *before* your route handler and can do shared work (parse the body, check a password, log the request) then call `next()` to pass control onward. Picture an onion: the request passes inward through each layer to the core handler, and the response passes back out. Express, the most popular Node framework, is built on exactly this idea — this project rebuilds a mini version of it.

**Routing** means deciding which function handles which request. A **route table** is a list like "GET /todos → listHandler". A path like `/todos/:id` contains a **path parameter** — `:id` matches any value, so `/todos/7` gives you `params.id === "7"`.

**async/await**: an `async` function can pause at `await somethingSlow()` without freezing the whole program. `for await (const chunk of req)` is a loop that waits for each chunk to arrive.

## 3. Walking through the original code

The original is one file, one giant handler.

```js
var todos = [];
var nextId = 1;
```

Storage is a plain array in memory, plus a counter for IDs. Restart the server and everything is gone (that's fine for learning).

```js
if (req.method === "GET" && req.url === "/todos") {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(todos));
}
```

Routing by if/else: if it's a GET for `/todos`, reply 200 with the array as JSON. So far so good.

```js
} else if (req.method === "POST" && req.url === "/todos") {
  var chunks = [];
  req.on("data", function (c) { chunks.push(c); });
  req.on("end", function () {
    var body = JSON.parse(Buffer.concat(chunks).toString());
    todos.push({ id: nextId++, title: body.title, done: false });
```

For POST it collects the body chunks by hand, parses the JSON with **no** try/catch, and pushes whatever arrived — no check that `title` even exists.

```js
} else if (req.method === "PUT" && req.url.startsWith("/todos/")) {
  var id = parseInt(req.url.split("/")[2]); // "abc" -> NaN, no check
```

To get the id out of `/todos/7`, it splits the string on `/` and takes piece number 2. `"/todos/abc"` gives `NaN` (Not a Number) and nothing notices.

```js
if (!found) {
  res.writeHead(404);
  res.end("nope");
  return;
}
```

The 404 here is plain text `"nope"` — while other errors elsewhere are JSON, or missing entirely. Every error response was improvised on the spot.

## 4. What's wrong with it (in beginner terms)

**1. String-surgery routing.** `req.url.split("/")[2]` works until it doesn't. Add a route like `/todos/7/comments` and suddenly the PUT branch matches things it shouldn't. Every new route means re-reading the whole ladder to find where it fits, and each one re-invents id extraction.

**2. Copy-pasted body parsing.** The chunk-collecting dance is written once for POST and again for PUT (`chunks2`!). Later you fix a bug in one copy — say, handling an empty body — and forget the other. Now the same request behaves differently on two routes and you spend an evening finding out why.

**3. One bad client kills everyone.** `JSON.parse` with no try/catch means an *uncaught* error. In Node, an uncaught error doesn't fail one request — it terminates the whole process. Story: your API has 50 happy users; someone's buggy script sends `{oops`; the server process dies; all 50 users see "connection refused." One stranger's typo took down your service.

**4. No validation.** `{}`, `{"title":""}`, `{"title":12345}` all get stored. Weeks later your front-end crashes rendering a numeric title, and the bad data is already saved — garbage that got in is much harder to remove than garbage rejected at the door.

**5. Inconsistent errors.** One route says text `"nope"`, another sends JSON, another nothing. Anyone writing a client for your API has to handle every shape, and they'll find them one crash at a time.

**6. Rules tangled into plumbing.** "What makes a valid todo?" lives inside HTTP handler code. You cannot test that rule without starting a server and sending real HTTP — so, realistically, nobody tests it.

## 5. Try it yourself first!

Try fixing the original before reading on. Hints, vague to specific:

1. What code is written more than once? Could it be written once and shared?
2. Could routes live in a *list* (data) instead of an if/else ladder (code), with one loop that finds the match?
3. What happens if you wrap the ENTIRE request handling in one try/catch? What would you send back when something is caught?
4. Could a thrown error *carry* its own status code, so the one catch knows whether to send 400, 404, or 500?
5. Could "the rules of todos" live in an object with methods like `create(fields)` and `update(id, fields)` that know nothing about `req` and `res`?
6. Separate three jobs: storing data, deciding rules, translating HTTP. Three chunks of code, each ignorant of the ones above it.

## 6. Understanding the refactored solution

**`app.js` — the mini framework.** `createApp()` returns an object with `app.get(path, handler)` etc., which just push rows into a `routes` array — a **table**, searched by a matcher function (borrowed from project 60) that understands `:id` patterns. For each request it builds a `ctx` (context) object holding everything a handler needs: `method`, `path`, `params`, `body`, and a `ctx.json(status, data)` helper. Because *every* response goes through `ctx.json`, every response has the same shape automatically — "consistency by construction."

The middleware onion is built here:

```js
const chain = [...middlewares, (c) => endpoint(c)];
const dispatch = (i) => async (c) =>
  i < chain.length - 1 ? chain[i](c, dispatch(i + 1)) : chain[i](c);
```

Each middleware gets `(ctx, next)` where `next` runs the rest of the chain. The route handler sits at the core.

And there is exactly **one** try/catch — the **error boundary**:

```js
try {
  await dispatch(0)(ctx);
} catch (err) {
  if (err instanceof HttpError) ctx.json(err.status, { error: err.message });
  else { console.error(err); ctx.json(500, { error: 'Internal server error' }); }
}
```

Handlers anywhere just `throw new HttpError(404, "No todo...")` and this one place turns it into JSON. Unexpected bugs become a logged 500 that leaks no internals to strangers.

**`jsonBody()`** is body parsing written once, as middleware. Malformed JSON becomes a 400 *for that one client* — the process survives. It also rejects bodies over ~1MB with 413 ("Payload Too Large") so nobody can flood your memory.

**`todos.js` — three layers.**
- `createRepo()` — the **repository**: a Map plus insert/get/update/delete. Knows storage, zero rules. Swap it for a database later and nothing else changes.
- `createService(repo)` — the rules: titles must be non-empty strings under 200 chars, ids must be positive integers, missing todos are 404s. It throws `HttpError`s but never touches `req`/`res`.
- `registerTodoRoutes(app, service)` — four one-liner routes that translate HTTP into service calls. Too thin for bugs to hide in.

**`server.js`** is the **composition root** — the one place that assembles the pieces and calls `listen`. Crucially, it only listens when run directly; tests `import { buildApp }` instead.

**The tests** (`api.test.js`) start the app on port `0` (meaning "OS, pick any free port"), then use `fetch` — the built-in function for making HTTP requests — to talk to it over *real* HTTP. They walk the full create/list/update/delete story, send `{oops` and prove the server answers 400 *and stays alive*, check every invalid body is rejected with a reason, and confirm every error has the exact shape `{ error: "..." }`. This all runs locally — no internet needed.

## 7. Words you learned (glossary)

- **API** — a program-facing interface: a server that speaks data, not web pages.
- **HTTP** — the request/response protocol of the web (method + path + body → status + body).
- **REST** — the convention of using HTTP verbs on noun paths (`GET /todos`).
- **JSON** — text format for data: `{"a":1}`. `JSON.parse` / `JSON.stringify` convert it.
- **status code** — 3-digit result number: 200 OK, 201 created, 400 bad request, 404 not found, 413 too large, 500 server error.
- **port** — numbered door on a machine that a server listens on (port 0 = "pick one for me").
- **localhost** — this same computer.
- **chunk / Buffer** — a piece of raw bytes; request bodies arrive as several.
- **middleware** — a `(ctx, next)` function running shared work before the handler.
- **route table** — routes as data (a list) instead of an if/else ladder.
- **path parameter** — the `:id` in `/todos/:id`; its value lands in `params`.
- **error boundary** — the single try/catch that converts all thrown errors into responses.
- **throw** — raise an error that travels up until something catches it.
- **repository (repo)** — the layer that only stores and fetches data.
- **service** — the layer holding business rules, ignorant of HTTP.
- **composition root** — the one file that wires all the parts together.
- **validation** — checking input is legal before accepting it.
- **integration test** — a test exercising the real assembled system (real HTTP here).
- **fetch** — built-in function for making HTTP requests from JS.
- **ctx (context)** — the per-request object carrying everything handlers need.

## 8. Experiments to try on the plane (no internet needed)

Local Node servers work perfectly offline — `localhost` never touches the network. Run the server with `node 65-rest-api/refactored/server.js` and test with `node --test 65-rest-api/`.

1. **Add a GET-one route.** In `todos.js` routes, add `app.get('/todos/:id', (ctx) => ctx.json(200, service.getOne(ctx.params.id)))` and add a `getOne` to the service using `parseId` + `mustExist`. Expected: `curl localhost:3000/todos/1` returns one todo; `/todos/999` returns `{"error":"No todo with id 999"}` with status 404.
2. **Change a rule in ONE place.** In the service, change max title length from 200 to 10. Expected: the "title too long" test now fails (it posts 201 x's expecting acceptance of 200) — proof the rule lives in exactly one spot.
3. **Write a logging middleware.** Before `registerTodoRoutes`, add `app.use(async (ctx, next) => { console.log(ctx.method, ctx.path); return next(ctx); });`. Expected: every request prints a line, and everything still works — that's the onion.
4. **Crash on purpose.** Add `app.get('/boom', () => { throw new Error('oops'); })` in `buildApp`. Expected: visiting `/boom` gets `{"error":"Internal server error"}` and a stack trace in the server's console — but the server keeps running.
5. **Re-break the original.** Run `node 65-rest-api/original.js`, then in another terminal: `curl -X POST localhost:3000/todos -d '{oops'`. Expected: the server process crashes instantly. Now you've *seen* problem 3, not just read about it.
