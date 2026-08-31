# 📘 Learning Guide: Collaborative Todo List

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A todo list that **two people can edit at the same time**, in two different browser windows. When Alice adds "call the bank" on her screen, it appears on Bob's screen almost instantly — and when Bob ticks off "buy milk", Alice sees the line-through appear on hers.

Sample run (after starting the refactored server):

```
node 68-collab-todo/refactored/server.js
collab todos at http://localhost:3000 — open two windows
```

Open that address in two windows. Type a todo in one, press Enter — it shows up in **both**. This works completely offline: "localhost" means "this computer", so no internet is involved.

The original file is different: it's a small script that *simulates* the naive way to build this, and prints out proof that the naive way silently loses data.

## 2. Concepts you need first

**Client and server.** A *server* is a program that waits for requests and answers them. A *client* is a program that sends those requests — here, your browser. Both run on your own machine in this project.

**HTTP.** The language browsers and servers speak. A client sends a *request* ("GET /todos") and the server sends back a *response* (a status code like 200 plus some data). Each request uses a *method* — a verb saying what you want:

- `GET` = read something
- `POST` = create something
- `PUT` = update something
- `DELETE` = remove something

**JSON.** A text format for data. `{"id": 1, "title": "buy milk", "done": false}` is JSON. JavaScript converts to and from it easily:

```js
const text = JSON.stringify({ a: 1 });  // '{"a":1}'  (object -> text)
const obj = JSON.parse('{"a":1}');      // { a: 1 }   (text -> object)
```

**Deep copy.** `JSON.parse(JSON.stringify(x))` is a trick to copy an object *completely*, so changing the copy can't change the original. The original.js "server" uses it to simulate data crossing a network.

**Polling.** Asking the server "anything new?" over and over on a timer (say, every 2 seconds). Simple, but wasteful (most answers are "no") and slow (news can be up to 2 seconds old).

**WebSocket.** A two-way pipe between browser and server that *stays open*. Instead of the client asking repeatedly, the server can **push** a message the instant something happens. In the browser it looks like:

```js
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (e) => console.log('server said:', e.data);
```

Project 67 built this from scratch; this project reuses that code.

**Race condition.** A bug that only appears when two things happen at nearly the same time, in an unlucky order. The star of this project is one specific race called the **lost update**: two people save at almost the same moment, and the second save silently erases the first person's change.

**Event.** Instead of storing "the current list", you can store "the list of things that *happened*": "todo 2 was added", "todo 1 was toggled". Each such record is an event.

**Event log.** All events, in order, each stamped with a growing number called a `version` (1, 2, 3, …). If you replay the events from the start, you rebuild the current list. If you were away, you only need the events after the last version you saw.

**Optimistic UI.** When you click, the screen updates *immediately* — before the server confirms — because the app is "optimistic" that the server will say yes. If the server says no, the app undoes it. Feels instant instead of laggy.

**Pure function.** A function that only reads its inputs and returns a new value — it never modifies anything outside itself. Pure functions are easy to test: same input, same output, every time.

```js
function add(state, n) { return { ...state, count: state.count + n }; }
// add({count: 1}, 2) is ALWAYS {count: 3}; the original object is untouched
```

The `...state` part is the **spread operator**: it copies all properties of `state` into a new object, so we build a changed copy instead of editing the original.

**Map and Set.** Built-in collections. A `Map` stores key→value pairs (`todos.set(1, todo)`, `todos.get(1)`). A `Set` stores unique values (`myTags.has('a1')` asks "is 'a1' in there?").

**Last-write-wins.** A conflict rule: if two people change the same thing, whichever change the server processed *last* is the one that sticks. Simple and predictable.

## 3. Walking through the original code

The original doesn't start a real server — it plays out the buggy design in one script so you can watch the bug happen every time.

```js
var serverList = [{ id: 1, title: "buy milk", done: false }];
function apiGet() { return JSON.parse(JSON.stringify(serverList)); }
function apiSave(list) { serverList = JSON.parse(JSON.stringify(list)); }
```

This is the pretend server. `apiGet` hands out a deep copy of the whole list (like a GET request would); `apiSave` **replaces the whole list** with whatever you send (like a naive save). The deep copies simulate the fact that data sent over a network is a copy, not a shared object.

```js
var alice = apiGet();
var bob = apiGet();
```

Two pretend browsers each fetch the list. Each now holds a *snapshot* — a copy frozen at the moment they fetched it.

```js
alice.push({ id: 2, title: "alice: call the bank", done: false });
apiSave(alice);
```

Alice adds a todo to *her copy* and saves her **entire list**. The server now has both todos. So far so good.

```js
bob[0].done = true;
apiSave(bob);
```

Bob — whose copy is now *stale* (out of date), because he fetched it before Alice saved — ticks off "buy milk" and saves **his entire list**. His list never had Alice's todo. The server replaces everything with Bob's two-second-old view. Alice's todo is gone. The script then prints the server list to prove it: no error, no warning, just missing data.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — the lost update.** Here's how it bites you: you and a teammate share a grocery list app built this way. You add "birthday cake" at 3:00:01. Your teammate ticks off "eggs" at 3:00:02 — using a screen that loaded at 2:59:59. Their save overwrites yours. Saturday comes; there is no cake. Nobody saw an error, so you blame yourself ("did I forget to press save?"). Apps with this bug feel haunted.

**Flaw 2 — whole-list writes.** Every save says "the entire list is now exactly THIS". So *any* overlap between two people destroys data — the "blast radius" of every write is everything. If Bob had instead sent the tiny message "set done=true on todo 1", the server could apply it without touching Alice's todo. Smaller writes = smaller damage.

**Flaw 3 — polling.** Asking "anything new?" every 2 seconds means changes take up to 2 seconds to show up, and with 100 users you're answering 50 pointless requests a second. Worse, that 2-second staleness window is exactly what makes Flaw 1 likely. Project 67 already built the push pipe (WebSocket) that removes the waiting.

## 5. Try it yourself first!

1. **Vague:** The core problem is that clients send *state* ("here's the whole list"). What if they sent *changes* instead?
2. **Warmer:** Design three small write operations — add one todo, toggle one todo, delete one todo — and make the server apply each one to *its* list. Now Bob's toggle can't erase Alice's add.
3. **Warmer still:** Have the server number every change it applies (1, 2, 3, …) and keep them all in an array — an event log. Broadcast each event to every connected browser over a WebSocket.
4. **Specific:** Make each client rebuild its list purely from received events, in server order — including its *own* edits, which come back through the same pipe. Two clients that receive the same events in the same order *must* end up identical.
5. **The tricky bit:** If you show your own edit instantly (optimistic UI) *and* it also comes back from the server, you'll show it twice. Fix: tag each edit with a random string (`originTag`), send the tag with the write, and when an event arrives with a tag you recognize, *replace* your placeholder instead of appending.
6. **Reconnects:** Store the highest version you've applied. On reconnect, ask the server for "everything after version N" (`?since=N`). Missed messages become a simple filter.

## 6. Understanding the refactored solution

Three files, three jobs.

**`server.js` — the source of truth.** It composes project 65's HTTP framework and project 67's WebSocket code, and adds the event log. The heart is `commit`:

```js
function commit(type, data, originTag) {
  const event = { version: eventLog.length + 1, type, ...data, originTag };
  eventLog.push(event);
  const frame = encodeText(JSON.stringify(event));
  for (const s of sockets) s.write(frame);
  return event;
}
```

Every mutation (POST/PUT/DELETE handler) validates its input, updates the server's `todos` Map, then calls `commit` — which numbers the event, appends it to the log, and pushes it to every open socket. Note the rule stated in a comment: writes go through HTTP (where they can be validated and rejected with proper errors), and the socket is a *read-only firehose* — clients never send edits through it. One door per direction keeps each door simple. When a WebSocket connects with `?since=N`, the server first replays every logged event with `version > N` — that's the whole catch-up mechanism.

**`sync.js` — the client's brain, as pure functions.** `optimisticAdd` and `optimisticToggle` return a *new* state with your edit applied and marked `pending: true` (the page renders pending rows dimmed — "not confirmed yet" is visible, not secret). `applyEvent` is the single entry point for server truth. In order it: ignores stale events (`event.version <= state.version` — so replays are harmless), handles deletes, recognizes your own edits by `originTag` and swaps the placeholder in place (no duplicate, no flicker), and applies everyone else's events by inserting-or-updating by id (an "upsert"). Because it's pure, the tests can drive it with hand-written events and check exact outcomes.

**`index.html` — the wiring.** Keystroke → optimistic update → `fetch` to the HTTP API. Socket message → `applyEvent` → re-render. If a write is rejected, rollback is just "refetch the log and rebuild" — no undo bookkeeping needed, because the log is the truth. On disconnect it retries with growing delays (500ms, 1s, 2s… capped at 8s — called *exponential backoff*), reconnecting with `?since=<my version>`.

**The tests.** `sync.test.js` unit-tests the brain — including a test that replays the original's exact Alice/Bob scenario as events and asserts both clients converge with *nothing lost*, and a true-conflict test where two people toggle the same todo: last write wins, and crucially both clients agree. `server.test.js` is an *integration test* (it exercises the real running system): it starts the server, makes real HTTP requests with `fetch`, and plays the part of a browser using project 67's own frame decoder over a raw socket — verifying that an HTTP write really is pushed out, that late joiners catch up via `?since=`, and that validation still rejects bad input.

## 7. Words you learned (glossary)

- **Client / Server** — the asker / the answerer in a networked program.
- **HTTP** — the request/response language of the web; methods GET/POST/PUT/DELETE say read/create/update/remove.
- **JSON** — text format for data; `JSON.stringify` / `JSON.parse` convert to/from it.
- **Deep copy** — a full independent copy of an object, changes don't leak back.
- **Snapshot / stale** — a copy of data frozen at fetch time / one that's now out of date.
- **Polling** — repeatedly asking "anything new?" on a timer.
- **WebSocket** — a persistent two-way pipe; lets the server push instantly.
- **Push** — the server sending you news without being asked.
- **Race condition** — a bug that depends on unlucky timing between two actors.
- **Lost update** — a race where the second save silently erases the first.
- **Event / Event log** — a record of one change / the numbered, ordered list of all of them.
- **Version** — the growing sequence number stamped on each event.
- **Replay / catch-up** — rebuilding state by re-applying events; `?since=N` fetches just the missed ones.
- **Optimistic UI** — show the edit immediately, confirm (or roll back) later.
- **originTag** — a random label on your own edit so you recognize its echo.
- **Upsert** — update if it exists, insert if it doesn't.
- **Pure function** — output depends only on input; nothing outside is modified.
- **Spread operator (`...`)** — copies an object's/array's contents into a new one.
- **Map / Set** — built-in key→value store / collection of unique values.
- **Last-write-wins** — conflict rule: the change the server ordered last sticks.
- **Exponential backoff** — retrying with doubling delays so you don't hammer a down server.
- **Integration test** — a test that runs the real assembled system, not one piece.
- **Blast radius** — how much data one operation can damage.

## 8. Experiments to try on the plane (no internet needed)

Everything here runs locally — `node` servers and `localhost` need no internet.

1. **Make the original even worse.** In `original.js`, add a third client `carol = apiGet()` before Alice saves, have her rename a todo, and save last. Expected: Carol's stale snapshot wins and *both* Alice's and Bob's changes vanish — blast radius in action. (Don't save over the original — copy it first, e.g. to the scratch folder.)
2. **Watch convergence live.** Run the refactored server, open two windows, and add todos rapidly in both at once. Expected: both windows always end up showing the identical list, in the same order — server order.
3. **Kill and revive the server.** With both windows open, stop the server (Ctrl+C), click around (writes fail, status shows re-syncing/disconnected), then restart it. Expected: both windows reconnect automatically (watch the backoff delays grow in the status line) — though since the restarted server's log is empty (it lives in memory), the list resets; that's a great prompt to think about saving the log to a file.
4. **Break the dedupe on purpose.** In your own copy of `sync.js`, make `applyEvent` ignore `originTag` (treat every event as someone else's). Run `node --test 68-collab-todo/` from your copy. Expected: the "replaces the placeholder" test fails — you'd see your own adds duplicated: once pending, once confirmed.
5. **Change the conflict rule.** In the "true conflict" test in `sync.test.js` (again, on a copy), swap the order of the two version-2/version-3 events. Expected: both clients still agree with each other, but now `done` ends up `true` — proof that "server order decides" is the whole rule.
