# CS 35 — integration-testing

**Lesson: unit tests prove your functions are right; integration tests prove
your *app* is. Start Kestrel on a random port, hit it with `HttpClient`, assert
status codes and JSON bodies, stop it — all inside `-- test`.**

## Run it

```
dotnet run csharp/35-integration-testing/original.cs
dotnet run --project csharp/35-integration-testing/refactored
dotnet run --project csharp/35-integration-testing/refactored -- test
```

Original (http://localhost:5035) — three bugs, two commands. `$BODY` is
`{"lines":[{"sku":"BOOK-1","qty":3,"unitPrice":19.99}]}`:

```
curl -i -X POST http://localhost:5035/orders -H "Content-Type: application/json" -d $BODY
   -> 200 OK (should be 201), no Location, "subtotal":59.97,"tax":4.7976,"total":64.77
curl -i http://localhost:5035/orders/999    -> HTTP/1.1 200 OK  /  null
```

The refactored server answers the same POST with `201 Created`,
`Location: /orders/1`, and `subtotal 59.97 + tax 4.80 = total 64.77`;
`/orders/999` is a `404`; `DELETE /orders/1` is `204`, then `404` on a retry.

## What's wrong with the original?

1. **Money in `double`.** `19.99` is really `19.98999999999999844…`, so totals
   drift and the JSON grows a tail of nines.
2. **The pieces and the whole are rounded inconsistently** — the total is
   rounded, `subtotal` and `tax` are not — so the response contains three
   numbers that do not add up.
3. **`Math.Round` is banker's rounding.** `2.665` becomes `2.66`. Defensible
   statistics, wrong invoices — and nobody chose it; it was the default.
4. **A missing order returns `200 OK` with body `null`**, so every
   `if (res.ok)` takes the happy path and explodes three files away. And
   **creating returns `200` with no `Location`**.
5. **Zero tests** — and note *why* that mattered differently per bug. #1–#3
   fall to a unit test of the arithmetic. #4's two faults are status codes and
   headers: the mistake *is* the HTTP translation, so there is no function to
   call. Only a test that speaks HTTP can see them.

## What changed in the refactor

- **`Money.Round`** — `decimal`, `MidpointRounding.AwayFromZero`, one place.
  **`Totals.For`** rounds each line, sums, rounds the tax, then adds two
  already-rounded numbers, so `Subtotal + Tax == Total` *exactly*. A property
  test walks 800 qty/price combinations to prove it.
- **`OrderRules.Validate`** returns every problem at once, named by line number;
  **`OrderStore`** owns ids and locking; endpoints only translate.
- **`Api.Build(args)`** — the composition root became a *function*. Program.cs
  runs it on 5035; the harness builds the same app on port 0.
- **`HttpTests.cs`** — a real in-process suite: `StartAsync` on
  `http://127.0.0.1:0`, read the bound address back from `app.Urls`, drive it
  with `HttpClient` (happy *and* 400/404 paths, asserting status codes, the
  `Location` header, content type, JSON bodies), `StopAsync` in a `finally`.
  33 HTTP assertions; the whole suite finishes in under ten seconds. It is a
  hand-rolled **`WebApplicationFactory`** (`Microsoft.AspNetCore.Mvc.Testing`,
  a NuGet package); LEARN.md maps one onto the other.

## Key takeaway

Every test suite has a shape, and the useful question is not "how many tests?"
but "which failures would survive them?". Unit tests of `Totals` would have
caught the money bugs and sailed past the 200-with-null. An integration suite
catches wiring, serialization, status codes, and headers — the joints — and is
slower and vaguer when it fails. Write mostly the first, always some of the
second.
