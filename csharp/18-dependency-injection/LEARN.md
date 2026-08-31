# 📘 Learning Guide: Dependency Injection

Read this before or alongside the README — it teaches what dependency injection is, why statics and inline `new` strangle tests, and what ASP.NET Core's container and its three lifetimes actually do.

## 1. What are we building?

A quotes API: list all quotes (`GET /quotes`), get a deterministic "quote of the day" (`GET /quotes/daily`), and add a quote which also sends a notification (`POST /quotes`).

Both versions serve identical responses. The difference is *wiring*. The original reaches for `QuoteRepo.Instance` (a global singleton), calls `new EmailStub()` inline, and grabs `DateTime.Now` out of thin air. The refactor hands every one of those in from outside — and the payoff is on display in each version's test run: the original's tests poison each other and print a FAIL; the refactor's run green in any order.

## 2. Concepts you need first

### A "dependency" is anything your code reaches out to

`QuoteService` needs three things it doesn't own: somewhere to store quotes, the current date, and a way to send notifications. Those are its **dependencies**. Every interesting class has some; the design question is only *how they arrive* — grabbed from globals, or handed in?

### The singleton pattern (and why hand-rolling it hurts)

```csharp
class QuoteRepo
{
    public static readonly QuoteRepo Instance = new();
    private QuoteRepo() { }          // nobody else may construct one
}
```

This guarantees exactly ONE repo, reachable from anywhere as `QuoteRepo.Instance`. Convenient — and that's the trap. "Reachable from anywhere" means *invisible in signatures*: nothing about an endpoint tells you it touches the repo. "Exactly one" means tests share it: whatever test 1 does, test 2 inherits. And the private constructor means nobody can ever build a fresh or fake one. It's a global variable wearing a design-pattern costume.

### Dependency injection: the js#13 / cs#10 move, scaled up

In cs#10 you replaced switch-on-string with an `ICipher` interface, and *callers chose* which cipher to pass in. **Dependency injection (DI)** is that same idea applied to a whole app's wiring: a class *declares* what it needs (as constructor parameters, typed as interfaces) and *someone outside* supplies the concrete things.

```csharp
public class QuoteService
{
    public QuoteService(IQuoteRepo repo, IClock clock, INotifier notifier) { ... }
}
```

Read that constructor as an honest ingredients list: no hidden statics, no surprise `new`. Whoever builds a `QuoteService` decides what it talks to — production hands it real parts, tests hand it fakes. "Injection" just means "passed in".

### Time is a dependency too

`DateTime.Now` looks innocent, but it's a hidden input: the answer to "which quote is today's?" depends on it, and you can't control it from a test. Wrap it:

```csharp
public interface IClock { DateTime Now { get; } }
public class SystemClock : IClock { public DateTime Now => DateTime.Now; }
```

Production registers `SystemClock`; tests use a `FakeClock` whose `Now` is whatever the test says. Suddenly "what does `/quotes/daily` return on January 3rd?" is a one-line test instead of "change your computer's clock".

### The DI container: a factory that knows your recipes

You *could* wire everything by hand (js#65 called this spot the composition root, and cs#15–17 did `var service = new TodoService();`). But as apps grow — services needing repos needing config needing... — ASP.NET Core ships a **container** that builds things for you. You register recipes before `Build()`:

```csharp
builder.Services.AddSingleton<IQuoteRepo>(new InMemoryQuoteRepo(seedQuotes));
builder.Services.AddSingleton<IClock, SystemClock>();      // interface → implementation
builder.Services.AddScoped<QuoteService>();                // concrete class, built on demand
```

then endpoints simply *declare* needs as parameters:

```csharp
app.MapGet("/quotes", (QuoteService svc) => svc.All());
```

When a request arrives, the container sees `QuoteService`, checks the recipe book, sees its constructor needs `IQuoteRepo` + `IClock` + `INotifier`, builds/fetches each, and hands the endpoint a fully-wired service. You never write the `new` chain.

### The three lifetimes — how long does an instance live?

Every registration picks one. The coffee-shop version:

- **Singleton** — the espresso machine. ONE for the whole shop; every order uses the same machine. `AddSingleton`: one instance for the app's lifetime. Use it for shared state (our repo *holds the quotes*, so it must be one) and stateless helpers (clock, notifier).
- **Scoped** — the cup. One per ORDER; everything involved in your order shares your cup, and the next order gets a new one. `AddScoped`: one instance **per HTTP request**. Concretely: a request arrives → the container starts a scope → the first ask for `QuoteService` builds one → everything during that request shares it → response goes out → it's discarded. Two simultaneous requests: two services.
- **Transient** — the napkin. A fresh one every single time anyone reaches for one. `AddTransient`: new instance per ask, even twice in the same request.

Rule of thumb you'll use for years: **stateful-and-shared → singleton; per-request work → scoped; cheap and stateless → transient is always safe.** And the one real trap: a singleton must never hold onto a scoped thing (the espresso machine can't keep your cup) — the container will actually throw if you try.

### Fakes: the whole payoff

A **fake** is a tiny hand-written implementation of an interface used in tests:

```csharp
public class FakeNotifier : INotifier
{
    public List<string> Sent { get; } = new();
    public void Notify(string message) => Sent.Add(message);
}
```

Now a test can *assert* "adding a quote sent exactly one notification" by checking `Sent.Count` — no console spam, no email server, no spying on side effects. Fakes only fit through **seams** — interface-typed constructor parameters. No seam, no fake: that's the original's whole disease.

## 3. Walking through the original code

Three endpoints, three hard wirings:

`GET /quotes` → `QuoteRepo.Instance.All()`. The static reach. `GET /quotes/daily` → `all[DateTime.Now.DayOfYear % all.Count]` — a perfectly good rule (same quote all day, rotates daily, wraps with `%` like cs#03's clock math) welded to the real clock. `POST /quotes` digs JSON by hand (cs#17's disease, still here), then `QuoteRepo.Instance.Add(quote)`, then `new EmailStub().Send(...)` — constructed *inside* the endpoint, used once, impossible to intercept.

Then scroll to the bottom: the "tests". `-- test` runs three checks against... the only repo that exists. Test 1 adds a quote and passes. Test 2 asserts a fresh app has 3 seeded quotes — **FAIL: there are 4 now.** Test 1's leftovers are still in the singleton, because there is no way to get a fresh repo: `Instance` is readonly and the constructor is private. Test 3 is printed as `SKIP impossible to write` — it would need to control today's date.

Run it yourself and look at the output. That FAIL isn't a bug in the tests — it's the architecture, visible.

## 4. What's wrong with it (in beginner terms)

**1. Tests share one world.** Every test inherits whatever every earlier test did to `Instance`. Reorder them, results change; run twice in one process, results change. Real projects with this disease end up with folklore: "run the suite in this order", "never run those two together". The problem isn't the tests — it's that the code offers no way to build a fresh world.

**2. There are no seams.** Want to check "adding a quote notifies someone" without actually notifying? You can't — the `new EmailStub()` is inside the endpoint. Want `/quotes/daily` for a known date? You can't — `DateTime.Now` is inside. A fake can only enter through a parameter typed as an interface, and there are none.

**3. Dependencies are invisible.** Nothing in any signature admits the endpoint touches storage, time, or email. To learn what the code *really* talks to, you read every line. Constructor injection turns that hidden knowledge into a visible ingredients list.

**4. Swapping implementations means editing every call site.** Move quotes to a database next month and you're hunting `QuoteRepo.Instance` through the codebase. In the refactor it's one registration line.

## 5. Try it yourself first!

Refactor the original. Hints, vaguest first:

1. 🌱 List `QuoteService`'s three dependencies (storage, time, notification). Write an interface for each — smallest possible: 1–2 members.
2. 🌿 Write `InMemoryQuoteRepo` with a *public* constructor taking optional seed quotes. Delete `static Instance` — that's the whole point.
3. 🌳 Write `QuoteService(IQuoteRepo, IClock, INotifier)` and move the three rules into it: reject blank text, blank author → "anonymous", daily = `Now.DayOfYear % count`. No statics, no `new` of collaborators inside.
4. 🍎 Register everything with `builder.Services` (which lifetime for the repo? why?), change endpoints to `(QuoteService svc, ...)`, then write `FakeClock` and `FakeNotifier` and re-create the original's three tests — including the two that poisoned each other and the one that was impossible.

## 6. Understanding the refactored solution

**The interfaces** (`Quotes.cs`, `Clock.cs`, `Notifier.cs`) are deliberately tiny — `IQuoteRepo` is two members. Small interfaces are easy to fake and hard to misuse; you'll meet this again as the "I" in design lore.

**`QuoteService.cs`** — all rules, zero reaching. Compare `Daily()` with the original's endpoint: same logic, but `_clock.Now` instead of `DateTime.Now`. One word changed; testability appeared.

**`Program.cs` is the composition root** — the single place that knows which concrete classes exist:

```csharp
builder.Services.AddSingleton<IQuoteRepo>(new InMemoryQuoteRepo(seed));
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<INotifier, ConsoleNotifier>();
builder.Services.AddScoped<QuoteService>();
```

The repo is a singleton because it *holds the data* — scoped would give every request its own empty list (a fun bug: POST a quote, GET returns nothing... try it in the experiments). The service is scoped: a fresh worker per request, sharing the singleton repo underneath. Endpoints shrink to declarations: `(QuoteService svc) => svc.All()` — the container does the rest.

**`Tests.cs`** — look at `Make`: every call builds a *complete fresh world* (new repo, new fakes, new service). The first two tests are the original's poisoned pair, now independent — both green, any order. The `FakeClock` block answers the question the original had to SKIP: set `clock.Now = new DateTime(2026, 1, 3)` and assert the pick wraps to index 0. And `FakeNotifier` proves both directions: a successful add records exactly one message; a rejected add records none. Notice there's no DI *container* in the tests at all — constructor injection works with plain `new`, which is exactly what makes it testable.

## 7. Words you learned (glossary)

- **Dependency** — anything a class needs but doesn't own (storage, clock, notifier).
- **Singleton pattern** — hand-rolled "one global instance" (`static Instance`, private constructor); global state in a costume.
- **Dependency injection (DI)** — dependencies are passed in, not grabbed; the caller decides.
- **Constructor injection** — dependencies arrive as constructor parameters typed as interfaces.
- **Seam** — a place where an implementation can be swapped (an interface-typed parameter).
- **Fake** — a small test implementation of an interface (`FakeClock`, `FakeNotifier`).
- **DI container** — the framework's factory: you register recipes, it builds object graphs (`builder.Services`).
- **Registration** — `AddSingleton/AddScoped/AddTransient<Interface, Implementation>()`.
- **Lifetime** — how long a container-built instance lives.
- **Singleton (lifetime)** — one instance for the whole app; the espresso machine.
- **Scoped** — one instance per HTTP request; the cup made for your order.
- **Transient** — a fresh instance every ask; the napkin.
- **Composition root** — the one place (Program.cs) where interfaces meet their real implementations.
- **Shared-state pollution** — tests changing global state that later tests inherit.

## 8. Experiments to try on the plane (no internet needed)

localhost servers run fine in airplane mode. Run one version at a time (both use port 5018).

1. **Watch the original poison itself.** `dotnet run csharp/18-dependency-injection/original.cs -- test` → expect `ok` for test 1, **`FAIL ... (test 1 polluted the shared singleton!)`** for test 2, `SKIP` for test 3. Then run the refactored tests — the same pair passes, plus four FakeClock tests the original couldn't express.
2. **Same API on the wire.** Start either server: `curl http://localhost:5018/quotes/daily` twice → the same quote both times (it's daily, not random). POST a quote and watch the server console print the `[email]`/`[notify]` line — that side effect is exactly what `FakeNotifier` captures silently in tests.
3. **Cause the classic lifetime bug.** In the refactored Program.cs, change the repo registration to `AddScoped<IQuoteRepo>(_ => new InMemoryQuoteRepo())` (per-request repo). Restart, POST a quote (201!), then GET /quotes → `[]`. Each request got its own repo, so the data evaporated between requests. Now you've *seen* why holders-of-state are singletons. Revert.
4. **Swap an implementation without touching endpoints.** Write `class LoudNotifier : INotifier { public void Notify(string m) => Console.WriteLine($"!!! {m.ToUpper()} !!!"); }` and change one registration line to use it. POST a quote — new behavior, zero endpoint edits. That single-line swap is the whole sales pitch of the composition root.
5. **Time-travel test.** Add a test: seed 5 quotes, set `clock.Now = new DateTime(2026, 12, 31)` (DayOfYear 365; 365 % 5 = 0) and assert the pick is index 0. Predict first, then run.
6. **Feel the missing-recipe error.** Comment out the `AddSingleton<IClock, ...>` line and start the server. Expect an exception at startup naming exactly what's missing: `Unable to resolve service for type 'IClock' while attempting to activate 'QuoteService'`. The container fails loudly and early — global statics fail silently and late. Restore the line.
