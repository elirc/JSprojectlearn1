# 📘 Learning Guide: Weather CLI

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **CLI** (command-line interface — a program you run by typing in a terminal) that shows the weather for a city:

```
node refactored/cli.js Manila
```

which would print something like:

```
Weather for Manila
  31°C, humid, wind 12 kph
```

The program asks a weather **API** over the internet for data, then formats it nicely. (An API — Application Programming Interface — is a website made for *programs* instead of people: you request a URL, it answers with data instead of a web page.)

One important note: the weather site used here (`api.example-weather.test`) is *fictional*. This project is about the **structure** of every "call an API" program — and its tests run fully offline, which is exactly the lesson.

## 2. Concepts you need first

### The terminal, arguments, and process.argv

When you type `node cli.js Manila`, the word `Manila` is an **argument** — extra input passed to the program. Node collects them in the array `process.argv`: index 0 is node, index 1 is the script file, index 2 is your first real argument.

```js
// save as args.js, run:  node args.js hello
console.log(process.argv[2]); // "hello"
```

### Environment variables and process.env

An **environment variable** is a named value that lives in your terminal session, *outside* any file. Programs read them via `process.env`.

```js
// In PowerShell:  $env:GREETING = "hi"; node greet.js
console.log(process.env.GREETING); // "hi"
```

Why they matter: things you must never publish (passwords, keys) go here, so they never end up in your code files.

### API keys and secrets

An **API key** is a password-like string that identifies you to an API (so they can bill you or ban you). If a key appears in a file you commit to **git** (the version-control system recording every change ever), it is recorded *forever* — even deleting it later leaves it in the history. That's why keys live in environment variables.

### URLs and query strings

A URL like `https://site.test/v1/current?city=Manila&key=abc` has a **query string** after the `?`: `name=value` pairs joined by `&`. If a value contains a space or `&`, it must be **URL-encoded** (special characters replaced with safe ones, like space → `+`). `URLSearchParams` does this for you:

```js
const params = new URLSearchParams({ city: "San Juan", key: "k" });
console.log(params.toString()); // "city=San+Juan&key=k"
```

Without encoding, `city=San Juan` breaks in transit — the server sees `city=San` and mystery junk.

### Promises and async/await

Network requests take time. A **Promise** is JavaScript's IOU: an object that will *later* hold a value or an error. **`async`/`await`** is the readable way to use them: `await` pauses this function (not the whole program) until the IOU pays out.

```js
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function demo() {
  await delay(500);
  console.log("half a second later"); // prints after the pause
}
demo();
```

An older style you'll see in the original file: `.then(fn)` chains ("when the IOU pays out, run `fn`") and `.catch(fn)` ("if it fails, run `fn`").

### fetch and HTTP — and the one trap

**HTTP** is the request/response language of the web. Every response carries a **status code**: 200 means OK, 404 means "not found", 401 means "you're not allowed", 500+ means "server broke". **`fetch(url)`** makes an HTTP request and returns a Promise of a response object. `res.json()` reads the response body as **JSON** (JavaScript Object Notation — data written as text, like `{"tempC":31}`) and gives you a real object.

The trap, and the heart of this project: **`fetch` does not treat 404 as a failure.** The Promise only rejects when the *network itself* fails (no wifi, no such server). A 404 arrives as a normal, successful-looking response — you must check `res.ok` (true only for 200-299) or `res.status` yourself:

```js
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
```

### Throwing errors, and typed errors

`throw` stops with an error; `try`/`catch` intercepts it. A **typed error** is your own error *class* (a template for making objects) extending the built-in `Error`, so a catcher can tell error kinds apart using `instanceof` ("is this object of that class?"):

```js
class ApiError extends Error {}
try { throw new ApiError("no such city"); }
catch (e) { console.log(e instanceof ApiError); } // true
```

This is how the CLI prints "typo in the city?" for one failure and "check your wifi" for another.

### Pure functions

A **pure function** computes its output from its inputs alone — no network, no printing, no clock. Pure functions are trivial to test: call with input, check output. `formatReport` (data in, string out) is pure; `fetch` is the opposite (a **side effect** — something that touches the world outside the function).

### Dependency injection

Fancy name, simple move: instead of a function *reaching out* for the real `fetch`, you **pass fetch in as a parameter** (with the real one as the default). Tests pass in a fake. That's all "injection" means.

```js
async function getData(fetchFn = fetch) {
  const res = await fetchFn("https://x.test");
  return res.json();
}
// test: getData(async () => ({ json: async () => ({ fake: true }) }))
```

### Exit codes

When a program ends, it hands the terminal a number: 0 = success, anything else = failure (conventionally 1 = general error, 2 = you used the command wrong). Scripts and other tools read this number. In Node you set it with `process.exitCode = 1`.

### Node's built-in test runner

`node --test` runs files ending in `.test.js`. `assert.equal(a, b)` fails the test unless they match; `await assert.rejects(fn, check)` passes only if the async `fn` fails, and lets `check` inspect the error.

## 3. Walking through the original code

It starts with the cardinal sin, flagged by its own comment:

```js
var API_KEY = "sk_live_9f2c81d7e4a0b356"; // <- oops. rotate it. again.

var city = process.argv[2];
```

The key is a **string literal** (typed directly into the source). And `city` is read with no check — run the program with no argument and `city` is `undefined`.

Then the request, built by gluing strings:

```js
fetch(
  "https://api.example-weather.test/v1/current?city=" +
    city + // Problem 3: not URL-encoded. "San Juan" becomes two params.
    "&key=" +
    API_KEY
)
```

Note `city` goes into the URL raw. If it's `undefined`, we literally ask the API about a city named "undefined".

```js
  .then(function (res) {
    return res.json();
  })
```

This is the fetch trap in action: no look at `res.status`, straight to `res.json()`. A "city not found" response body probably has no `city` or `tempC` fields...

```js
  .then(function (data) {
    console.log("Weather for " + data.city);
```

...so the crash happens *here*, in the printing code, as `undefined` weirdness — three lines and one file-mental-model away from the real cause (the 404).

```js
  .catch(function (e) {
    console.log("error", e);
  });
```

And every possible failure — no wifi, bad key, bad city — funnels into this one line and prints the same blob.

## 4. What's wrong with it (in beginner terms)

**The key in the source.** You push this file to GitHub to show a friend. A bot (they scan constantly) finds the key in minutes and starts making requests *as you*. You rotate the key (get a new one), but the old one is still visible in git history for anyone browsing. Real people get real bills this way.

**No argument check.** You forget the city. Instead of "Usage: weather <city>", you get a confusing API error about a city called "undefined" — the program lied to you about *where* the mistake was.

**No URL encoding.** Works for `Manila` for weeks. First user who types `San Juan` gets nonsense, and you can't reproduce it until you notice the space. Bugs that depend on *which* input are the ones that ship.

**Trusting every response.** The API has a hiccup and returns a 500 page. Your program tries to read `tempC` from an error page, and the crash message points at your *formatting* code. You debug the wrong function. This "crash far from the cause" pattern is the single most common async bug in JavaScript.

**One blob doing everything.** Fetch + format + print in one chain means you cannot test formatting without a live network and a real key. So it never gets tested, and the one place with the °C string-building bug goes unverified forever.

**One catch-all.** The user on a train with no wifi and the user who typo'd "Manlia" see the identical error dump. Neither knows what to do next.

## 5. Try it yourself first!

Try restructuring the original before reading the solution:

1. Split the program into: a function that fetches, a function that formats, and a tiny top layer that reads argv/env and prints. Which of the three can you test without internet?
2. Move the key out: read `process.env.WEATHER_API_KEY` in the top layer and *pass it in* as a parameter. If it's missing, fail early with a message naming the variable.
3. Check `city` before doing anything. What should the message and the exit code be?
4. Build the URL with `new URLSearchParams({ city, key })` instead of `+`.
5. Right after `await fetchFn(...)`: check `res.status`. Turn 404 and 401 into your own error classes with human messages. Only then call `res.json()`.
6. Make the fetch function a parameter with `fetch` as the default. Then write a test that passes a fake — an `async` function returning `{ ok: true, status: 200, json: async () => ({...}) }`.

## 6. Understanding the refactored solution

**`weather.js` — the logic layer.** First, two typed errors:

```js
export class ConfigError extends Error { ... }   // "you set the program up wrong"
export class ApiError extends Error { ... }      // "the API said no", carries .status
```

Then the main function's signature does three jobs at once:

```js
export async function getWeather(city, { apiKey, fetchFn = fetch } = {}) {
```

`apiKey` is a parameter — this file never reads `process.env`, so it works anywhere. `fetchFn = fetch` is the injection point: real fetch by default, fake in tests. The `= {}` means calling with no options object at all still works.

It validates first (missing city / missing key throw `ConfigError` *before* any network is touched — tests verify zero calls were made). Then `URLSearchParams` builds the encoded query. Then the boundary check:

```js
if (res.status === 404) throw new ApiError(404, `No such city: "${city}"`);
if (res.status === 401) throw new ApiError(401, 'API key was rejected.');
if (!res.ok) throw new ApiError(res.status, `Weather API failed (HTTP ${res.status})`);
return res.json();
```

This is "check `res.ok` once, at the boundary": past this point, every caller can trust the data is real weather. `formatReport` below it is pure — data object in, string out — including one small decision (omit the wind part when `windKph` is 0).

**`cli.js` — the thin shell.** It reads `process.argv[2]` and `process.env.WEATHER_API_KEY`, calls `getWeather`, prints `formatReport(data)`. Its one `catch` sorts errors by type: `ConfigError` → message + exit code 2 (misuse), `ApiError` → message + exit code 1, anything else → "Network problem ... check your connection". Different failures finally give different advice.

**`weather.test.js` — offline tests.** The star is the fake:

```js
function fakeFetch({ status = 200, body = {} } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { fn, calls };
}
```

It's a hand-made object shaped like a fetch response, plus a `calls` array recording every URL requested — so tests can assert not just *what came back* but *what was asked*. The tests cover: the happy path; that `San Juan` appears in the URL as `San+Juan`; that a missing city rejects with `ConfigError` *and made zero network calls*; that 404 and 401 become the right `ApiError`s; and that `formatReport` produces the exact expected string — the thing the original could never test.

## 7. Words you learned (glossary)

- **CLI**: a program you run and control from the terminal.
- **API**: a service programs talk to over the web for data.
- **API key**: a secret string identifying you to an API.
- **Secret**: any value (key, password) that must not be published.
- **Environment variable**: a named value in your terminal session; read via `process.env`.
- **git history**: the permanent record of every committed change.
- **argument / process.argv**: extra words after a command; Node's array of them.
- **Query string**: the `?name=value&name2=value2` part of a URL.
- **URL-encoding**: replacing unsafe characters in URL values (space → `+`).
- **URLSearchParams**: built-in that builds encoded query strings.
- **HTTP**: the web's request/response protocol.
- **Status code**: the response's number: 200 OK, 401 unauthorized, 404 not found, 500 server error.
- **fetch**: built-in function for making HTTP requests; only rejects on *network* failure.
- **res.ok**: true only for status 200-299 — you must check it yourself.
- **JSON**: data written as text, like `{"tempC":31}`.
- **Promise**: an object representing a value that arrives later.
- **async/await**: syntax for pausing a function until a Promise settles.
- **.then/.catch**: older Promise style; chain success/failure handlers.
- **Typed error**: your own `class X extends Error`, distinguishable via `instanceof`.
- **Boundary**: the one place where outside data enters your program — validate there.
- **Pure function**: output depends only on inputs; no side effects.
- **Side effect**: touching the outside world (network, disk, console).
- **Dependency injection**: passing a capability (like fetch) in as a parameter so tests can substitute a fake.
- **Fake / stub**: a hand-made stand-in for a real dependency, used in tests.
- **Exit code**: the number a program ends with; 0 = success, 2 = misuse.

## 8. Experiments to try on the plane (no internet needed)

The real API doesn't exist, so `cli.js` can never fetch live weather anyway — but **the tests are fully offline**: run `node --test .` in the project folder. Only a real `fetch` to a real server needs internet; everything below avoids that.

1. **See the ConfigError path for real.** Run `node refactored/cli.js` (no city, no key). Expected: the usage message and exit code 2 (`echo $LASTEXITCODE` in PowerShell shows 2). Then `node refactored/cli.js Manila` — expected: the missing-key message naming `WEATHER_API_KEY`.
2. **Add a 429 "slow down" case.** In `getWeather`, before the generic `!res.ok` check, throw `new ApiError(429, 'Rate limited — try again in a minute.')`. Write a copy of the 401 test with `status: 429`. Expected: your new test passes offline.
3. **Add a `--json` flag.** In `cli.js`, if `process.argv` includes `"--json"`, print `JSON.stringify(data)` instead of `formatReport(data)`. Expected: no change needed in `weather.js` at all — that's the payoff of layering. (You can only see it fire via the ConfigError paths offline, but the code change is testable by eye.)
4. **Break the encoding, watch the test catch it.** In `getWeather`, replace the `URLSearchParams` line with hand-gluing: `` `${BASE_URL}?city=${city}&key=${apiKey}` ``. Expected: the "San Juan stays one parameter" test fails. Restore it; test passes again.
5. **Extend the formatter.** Make `formatReport` add a line `  feels like N°C` only when `data.feelsLikeC` exists. Add a test with and without the field. Expected: both pass — you are now testing "network code" with zero network.
