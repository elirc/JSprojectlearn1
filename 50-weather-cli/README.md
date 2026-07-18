# 50 — CLI weather app

**Lesson: the anatomy of every "call an API" program — secrets in the
environment, typed failures at the boundary, and a fetch you can inject.**

## Run it

```
node 50-weather-cli/original.js Manila
node 50-weather-cli/refactored/cli.js Manila
node --test 50-weather-cli/
```

(The API host is fictional — both versions demo *structure*, and the tests
run fully offline. That's the point.)

## What's wrong with the original?

1. **The API key is a string literal in the source.** Commit it once and it's
   in git history forever; every clone, fork, and pastebin has it. Secrets go
   in the environment (`process.env.WEATHER_API_KEY`), never the repo.
2. **No argument handling** — `node original.js` cheerfully asks the API for
   the weather in `"undefined"`.
3. **The city isn't URL-encoded.** `"San Juan"` splits into two query params
   mid-flight.
4. **It trusts `res.json()` on any response.** `fetch` only rejects on
   *network* failure — a 404 arrives as a perfectly successful response with
   `ok: false`, sails through, and explodes three lines later in the
   formatting code, far from the actual cause.
5. **Fetch + format + print is one blob.** Testing the formatting requires a
   network and a live key. It never gets tested.
6. **One catch-all error.** "Check your wifi", "bad key", and "typo in the
   city" all print the same unhelpful blob.

## What changed in the refactor

- **Three layers**: `getWeather` (network), `formatReport` (pure), `cli.js`
  (argv/env/console). The middle layer is the program; the shell is wiring.
- **`fetchFn` is injected** (same move as project 43's injectable `sleep`):
  tests hand in a fake that records URLs and returns canned responses —
  offline, instant, deterministic.
- **HTTP status is checked at the boundary** and converted to typed errors
  (project 30): `ApiError(404)` says *no such city*, `ApiError(401)` says
  *key rejected*, `ConfigError` says *you forgot the env var* — and the CLI
  catch prints different advice (and different exit codes) for each.
- **`URLSearchParams` encodes the query** — never concatenate user input
  into a URL by hand.

## Key takeaway

`fetch` not rejecting on 404 is the single most common async bug in
JavaScript. Check `res.ok` **once**, at the boundary, convert to typed
errors there, and everything downstream can trust its input. And the moment
a key touches `process.env` instead of the source, your code is shareable.
