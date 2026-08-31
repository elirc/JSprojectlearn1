# 🏋️ Practice: Dependency Injection

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. List the authors (warm-up)

Add `GET /quotes/authors` returning a sorted list of distinct authors (case-insensitively distinct —
"ada" and "Ada" are one person). The logic goes in `QuoteService`, tested with a fresh world.
*Practices:* a service method over the injected repo + one declared-need endpoint.
**Hint:** `Distinct(StringComparer.OrdinalIgnoreCase)` then `OrderBy(a => a)`.
**Check offline:** `Check.Equal("ada,bob", string.Join(",", svc.Authors()), "distinct + sorted")` passes;
`curl http://localhost:5018/quotes/authors` → `["ada","bob",...]`.

### ⭐⭐ 2. A weekly quote (core)

Add `GET /quotes/weekly`: the same quote all week, rotating weekly. Rule: week number =
`(DayOfYear - 1) / 7` (Jan 1–7 is week 0, Jan 8–14 week 1, ...), pick `week % count`. Empty repo → 404.
*Practices:* a clock-dependent rule made testable purely because `IClock` is injected.
**Hint:** mirror `Daily()`; the tests set `clock.Now` to Jan 1, Jan 7, and Jan 8 and watch the pick change only once.
**Check offline:** add these Check tests — they should pass (3 seeded quotes):
`clock.Now = new DateTime(2026, 1, 7); Check.Equal("A", svc.Weekly()!.Text, "day 7 is still week 0");`
`clock.Now = new DateTime(2026, 1, 8); Check.Equal("B", svc.Weekly()!.Text, "day 8 starts week 1");`

### ⭐⭐ 3. Grow the seam: deleting quotes (core)

Add `bool Remove(string text)` to `IQuoteRepo` (true if something was deleted; match text
case-insensitively), implement it in `InMemoryQuoteRepo`, expose
`QuoteService.Remove(string? text)` that rejects blank input, and map
`DELETE /quotes?text=...` → 204 or 404. Notice who forces you to update the repo class: the compiler.
*Practices:* evolving an interface — every implementer must follow, and the tests prove the rule.
**Hint:** `_quotes.RemoveAll(q => string.Equals(q.Text, text, StringComparison.OrdinalIgnoreCase)) > 0`.
**Check offline:** `Check.True(!svc.Remove("   "), "blank text removes nothing")` passes;
`curl -i -X DELETE "http://localhost:5018/quotes?text=Ship%20it."` → `404` before adding it, `204` after.

### ⭐⭐ 4. One notification, many places: CompositeNotifier (core)

Write `CompositeNotifier : INotifier` that forwards each message to *every* notifier it was built
with, plus a `FileNotifier` appending lines to `notifications.log`. Register the composite so a POST
both prints to the console *and* appends to the file — without touching `QuoteService` or any endpoint.
*Practices:* composing implementations behind one interface; the composition root as the only edit site.
**Hint:** `public CompositeNotifier(params INotifier[] targets)` makes wiring read nicely.
**Check offline:** add this Check test — it should pass:
`var f1 = new FakeNotifier(); var f2 = new FakeNotifier(); new CompositeNotifier(f1, f2).Notify("x"); Check.Equal(1, f2.Sent.Count, "both targets heard it");`
Then POST a quote and `cat notifications.log`.

### ⭐⭐⭐ 5. Randomness is a dependency too (challenge)

Add `GET /quotes/random`. The trap: `new Random()` inside the service makes the pick untestable —
exactly the `DateTime.Now` disease with a different clock. Introduce
`IRandom { int Next(int maxExclusive); }` with a `SystemRandom` implementation, inject it as a fourth
constructor parameter, and write a `FakeRandom` whose picks are scripted so the tests are exact.
Update `Make` in Tests.cs and register `SystemRandom` in Program.cs.
*Practices:* recognizing a hidden input and cutting a brand-new seam for it, end to end.
**Hint:** `FakeRandom` can hold a settable `NextValue` and return `NextValue % maxExclusive`.
**Check offline:** add this Check test — it should pass:
`rng.NextValue = 2; Check.Equal("C", svc.Random()!.Text, "the pick is exactly what the fake dictated");`

## Solutions

### 1. Authors

```csharp
// QuoteService.cs
public IReadOnlyList<string> Authors() =>
    _repo.All()
        .Select(q => q.Author)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .OrderBy(a => a)
        .ToList();

// Program.cs
app.MapGet("/quotes/authors", (QuoteService svc) => svc.Authors());
```

WHY: the endpoint declares its need (`QuoteService`) and the container assembles the whole
repo-clock-notifier graph behind it. Because the rule reads only `IQuoteRepo`, the test needs nothing
but a seeded `InMemoryQuoteRepo` — no container in sight, which is the point of constructor injection.

### 2. Weekly

```csharp
// QuoteService.cs
/// Same quote all week; a new pick every 7 days. Testable for the same
/// reason Daily() is: the date is an injected input, not a global.
public Quote? Weekly()
{
    var all = _repo.All();
    if (all.Count == 0) return null;
    var week = (_clock.Now.DayOfYear - 1) / 7;   // Jan 1-7 -> 0, Jan 8-14 -> 1, ...
    return all[week % all.Count];
}

// Program.cs
app.MapGet("/quotes/weekly", (QuoteService svc) =>
    svc.Weekly() is Quote q ? Results.Ok(q) : Results.NotFound());

// Tests.cs — inside a block using Make(...)
var svc = Make(out _, out var clock, out _);
clock.Now = new DateTime(2026, 1, 1);
Check.Equal("A", svc.Weekly()!.Text, "day 1 is week 0 -> index 0");
clock.Now = new DateTime(2026, 1, 7);
Check.Equal("A", svc.Weekly()!.Text, "day 7 is still week 0");
clock.Now = new DateTime(2026, 1, 8);
Check.Equal("B", svc.Weekly()!.Text, "day 8 starts week 1 -> index 1");
clock.Now = new DateTime(2026, 1, 22);
Check.Equal("A", svc.Weekly()!.Text, "week 3 wraps: 3 % 3 = 0");
```

WHY: the `- 1` matters — `DayOfYear` is 1-based, and without it Jan 7 and Jan 8 would land in the same
week (7/7 == 8/7 == 1). That off-by-one is invisible to manual testing and a one-line FakeClock test.
Integer division + modulo is the same clock math `Daily()` uses, one level up.

### 3. Remove

```csharp
// Quotes.cs — the interface grows...
public interface IQuoteRepo
{
    IReadOnlyList<Quote> All();
    void Add(Quote quote);
    bool Remove(string text);
}

// ...and the compiler now refuses to build until InMemoryQuoteRepo complies:
public bool Remove(string text) =>
    _quotes.RemoveAll(q => string.Equals(q.Text, text, StringComparison.OrdinalIgnoreCase)) > 0;

// QuoteService.cs — the rule: blank input never reaches the repo
public bool Remove(string? text) =>
    !string.IsNullOrWhiteSpace(text) && _repo.Remove(text.Trim());

// Program.cs — `string text` (non-nullable) makes ?text= required: missing -> automatic 400
app.MapDelete("/quotes", (QuoteService svc, string text) =>
    svc.Remove(text) ? Results.NoContent() : Results.NotFound());
```

WHY: changing the interface is a *contract* change, so the compiler walks you to every implementation
— that's the safety net statics never give. The service still owns validation (blank text is a
decision, not storage), and the endpoint translates the bool into 204/404 exactly like cs#16 taught.

### 4. CompositeNotifier

```csharp
// Notifier.cs
public class FileNotifier : INotifier
{
    private readonly string _path;
    public FileNotifier(string path) => _path = path;
    public void Notify(string message) =>
        File.AppendAllText(_path, $"{message}{Environment.NewLine}");
}

public class CompositeNotifier : INotifier
{
    private readonly INotifier[] _targets;
    public CompositeNotifier(params INotifier[] targets) => _targets = targets;
    public void Notify(string message)
    {
        foreach (var target in _targets) target.Notify(message);
    }
}

// Program.cs — the ONLY line that changes
builder.Services.AddSingleton<INotifier>(
    new CompositeNotifier(new ConsoleNotifier(), new FileNotifier("notifications.log")));
```

WHY: the composite is itself an `INotifier`, so neither `QuoteService` nor any endpoint can tell one
listener from five — fan-out became a wiring decision, made in the composition root. The Check test
proves the fan-out with two `FakeNotifier`s, no console and no filesystem involved.

### 5. IRandom

```csharp
// Clock.cs (or a new Random.cs) — the new seam
public interface IRandom { int Next(int maxExclusive); }

public class SystemRandom : IRandom
{
    private readonly Random _random = new();
    public int Next(int maxExclusive) => _random.Next(maxExclusive);
}

// QuoteService.cs — fourth ingredient
private readonly IRandom _random;
public QuoteService(IQuoteRepo repo, IClock clock, INotifier notifier, IRandom random)
{
    _repo = repo; _clock = clock; _notifier = notifier; _random = random;
}
public Quote? Random()
{
    var all = _repo.All();
    if (all.Count == 0) return null;
    return all[_random.Next(all.Count)];
}

// Program.cs
builder.Services.AddSingleton<IRandom, SystemRandom>();
app.MapGet("/quotes/random", (QuoteService svc) =>
    svc.Random() is Quote q ? Results.Ok(q) : Results.NotFound());

// Tests.cs — the fake, plus Make grows a line
public class FakeRandom : IRandom
{
    public int NextValue { get; set; }
    public int Next(int maxExclusive) => NextValue % maxExclusive;
}
// in Make: rng = new FakeRandom(); return new QuoteService(repo, clock, notifier, rng);

var svc = Make(out _, out _, out _, out var rng);
rng.NextValue = 2;
Check.Equal("C", svc.Random()!.Text, "the pick is exactly what the fake dictated");
rng.NextValue = 0;
Check.Equal("A", svc.Random()!.Text, "and it changes when the fake does");
```

WHY: "random" and "now" are the same kind of thing — inputs your code doesn't control — so they get
the same treatment: an interface, a real implementation registered once, a fake in tests. The `%`
inside `FakeRandom` keeps scripted values safe for any list size. Miss the registration and the
container fails loudly at startup naming `IRandom` — the missing-recipe error, now working for you.
