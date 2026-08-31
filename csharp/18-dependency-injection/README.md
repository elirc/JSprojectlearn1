# CS 18 — dependency-injection

**Lesson: cs#10's plug-in idea, applied to a whole app — depend on
interfaces, let the DI container hand them out, and tests slip in fakes.**

## Run it

```
dotnet run csharp/18-dependency-injection/original.cs
dotnet run csharp/18-dependency-injection/original.cs -- test    # watch test 2 FAIL
dotnet run --project csharp/18-dependency-injection/refactored
dotnet run --project csharp/18-dependency-injection/refactored -- test
```

Poke either server (GETs also work in a browser):

```
curl http://localhost:5018/quotes
curl http://localhost:5018/quotes/daily
curl -X POST http://localhost:5018/quotes -H "Content-Type: application/json" -d "{\"text\":\"Ship it.\",\"author\":\"ada\"}"
```

## What's wrong with the original?

Every dependency is hard-wired, three different ways:

1. **`QuoteRepo.Instance`** — a hand-rolled static singleton with a private
   constructor. There is exactly one repo in the universe; nobody (least of
   all a test) can get a fresh or fake one.
2. **`new EmailStub()` inline in the endpoint** — every add sends a real
   notification; no seam to slip a fake through.
3. **`DateTime.Now` inside `/quotes/daily`** — "which day is it" is an
   invisible input, so the rule is untestable for any *particular* day.

Run the original's own tests and watch the proof: test 1 adds a quote to
the shared singleton, so test 2 (`fresh app has 3 quotes`) **FAILs** — the
tests pollute each other through global state, and test 3 prints `SKIP
impossible to write`. Order changes results; that's shared-state poison.

## What changed in the refactor

- **Interfaces as seams**: `IQuoteRepo`, `IClock`, `INotifier` — with real
  implementations `InMemoryQuoteRepo`, `SystemClock`, `ConsoleNotifier`.
- **`QuoteService`** takes all three via constructor injection; it contains
  the rules (blank text rejected, blank author → "anonymous", daily pick =
  `DayOfYear % count`) and never touches a static or a `new`.
- **The container as the one wiring spot** (composition root):
  `AddSingleton<IQuoteRepo>(...)`, `AddSingleton<IClock, SystemClock>()`,
  `AddSingleton<INotifier, ConsoleNotifier>()`, `AddScoped<QuoteService>()`.
- **Endpoints declare needs as parameters** — `(QuoteService svc) => ...` —
  and the container supplies them per request.
- **Tests.cs builds a fresh world per test** with `FakeClock` (any date on
  demand) and `FakeNotifier` (records instead of sending). The original's
  two poisoned tests both pass now, in any order — and "what does Jan 3
  return?" is a one-line test instead of a SKIP.

## Key takeaway

`static Instance` and inline `new` are decisions frozen into concrete.
Constructor injection + the DI container move those decisions to one place
and make every collaborator swappable — which is just "easy to change,"
applied to *who talks to whom*.
