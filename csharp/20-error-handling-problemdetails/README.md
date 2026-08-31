# CS 20 — error-handling-problemdetails

**Lesson: expected failures become typed domain exceptions, ONE middleware maps
them to ProblemDetails — and endpoints stop wearing try/catch armor.**

## Run it

```
dotnet run csharp/20-error-handling-problemdetails/original.cs
dotnet run --project csharp/20-error-handling-problemdetails/refactored
dotnet run --project csharp/20-error-handling-problemdetails/refactored -- test
```

With either server on http://localhost:5020, poke the error paths:

```
curl -i http://localhost:5020/items/99
curl -i -X POST http://localhost:5020/items/3/purchase        (run it twice)
curl -i http://localhost:5020/items/by-category/electronixs   (note the typo)
curl -i http://localhost:5020/boom                            (refactored only)
```

## What's wrong with the original?

1. **Three different error shapes.** `{"err":...}`, `{"message":...,"ok":false}`,
   and a plain-text `ERROR: ...` — whichever endpoint you hit. A frontend (think
   js#65's fetch code) now needs per-endpoint error parsing, and every new
   endpoint invents shape #4.
2. **The swallowed exception.** `/items/by-category/electronixs` (a typo) returns
   **200 OK with `[]`** because a catch block assumes "exception = no matches"
   and fakes success. The UI shows "no items yet", the typo ships, nobody ever
   sees an error. Silent failure is the worst failure.
3. **Everything throws generic `Exception`**, so catch blocks can't tell "not
   found" (404) from "out of stock" (409) from "bad input" (400) — they guess
   one status for all of them, and guess wrong: not-found comes back as 500.
4. **Every endpoint body is wrapped in try/catch** — the same ceremony
   copy-pasted five times, drifting a little each time. Project 19 called this
   cross-cutting concern; here it is again, un-extracted.

## What changed in the refactor

- **Domain exceptions**: `ItemNotFoundException`, `OutOfStockException`,
  `UnknownCategoryException`. The *type* carries the meaning, like project 30's
  custom error classes in JS.
- **One `ErrorMapper.Map(ex)`** — a pure function from exception to
  `(status, title, detail)`. Being pure, it's fully tested without HTTP.
- **One middleware** (the only try/catch left) calls the mapper and responds
  with `Results.Problem(...)` — **ProblemDetails**, the standard error envelope
  (`application/problem+json`, RFC 9457): same `type/title/status/detail` shape
  for every error in the app.
- **Unexpected exceptions** (see `/boom`) map to a generic 500: the real message
  goes to the server log, never to the client.
- **Endpoints have zero try/catch.** They translate HTTP to domain calls and
  back; failure handling is declared once, not five times.

## Key takeaway

Decide which failures are *expected* (give them types and honest status codes)
and which are *bugs* (generic 500, details logged server-side). Then handle both
in exactly one place. Error handling is a cross-cutting concern — the moment you
see the same try/catch twice, it wants to be middleware.
