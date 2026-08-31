#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// original.cs — a quotes API wired straight to a hand-rolled static
// singleton (QuoteRepo.Instance), an inline `new EmailStub()`, and
// DateTime.Now. It serves perfectly. It also cannot be tested: every
// dependency is hard-wired, so the "tests" at the bottom of this file hit
// the ONE real repo — run them and watch them pollute each other.
//
// Run:    dotnet run csharp/18-dependency-injection/original.cs
// Tests:  dotnet run csharp/18-dependency-injection/original.cs -- test
// Then:   curl http://localhost:5018/quotes

using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/quotes", () => Results.Json(QuoteRepo.Instance.All()));

app.MapGet("/quotes/daily", () =>
{
    // "Quote of the day" — but WHICH day comes from DateTime.Now, grabbed
    // out of thin air. There is no way to ask "what does this return on
    // March 3rd?" without changing your computer's clock.
    var all = QuoteRepo.Instance.All();
    var pick = all[DateTime.Now.DayOfYear % all.Count];
    return Results.Json(pick);
});

app.MapPost("/quotes", (JsonElement body) =>
{
    if (!body.TryGetProperty("text", out var t) || t.ValueKind != JsonValueKind.String
        || t.GetString()!.Trim().Length == 0)
        return Results.Json(new { error = "text must not be empty" }, statusCode: 400);

    var author = "anonymous";
    if (body.TryGetProperty("author", out var a) && a.ValueKind == JsonValueKind.String
        && a.GetString()!.Trim().Length > 0)
        author = a.GetString()!.Trim();

    var quote = new Quote(t.GetString()!.Trim(), author);
    QuoteRepo.Instance.Add(quote);

    // `new` right here, welded in: EVERY caller of this endpoint sends a
    // real notification. A test of "adding a quote works" spams the
    // "email" console too — there is no seam to slip a fake through.
    new EmailStub().Send($"new quote by {quote.Author}: \"{quote.Text}\"");

    return Results.Json(quote, statusCode: 201);
});

// ---------------------------------------------------------------------------
// The "tests". They live at the bottom of the app file because the logic
// can't be reached from anywhere else — and they share the one static repo.
// ---------------------------------------------------------------------------
if (args.Contains("test"))
{
    Console.WriteLine("test 1: adding a quote bumps the count");
    var before = QuoteRepo.Instance.All().Count;
    QuoteRepo.Instance.Add(new Quote("Talk is cheap. Show me the code.", "Linus Torvalds"));
    Console.WriteLine(QuoteRepo.Instance.All().Count == before + 1
        ? "  ok  count went up by one"
        : "  FAIL count did not go up");

    Console.WriteLine("test 2: a fresh app has exactly the 3 seeded quotes");
    // FAILS — test 1 already added a 4th quote to the ONE AND ONLY repo.
    // There is no way to get a fresh one: the constructor is private and
    // Instance is readonly. The tests are welded together through shared
    // state, so their ORDER changes their results.
    Console.WriteLine(QuoteRepo.Instance.All().Count == 3
        ? "  ok  exactly the 3 seeded quotes"
        : $"  FAIL expected 3 quotes, found {QuoteRepo.Instance.All().Count} (test 1 polluted the shared singleton!)");

    Console.WriteLine("test 3: the daily quote for a known date is predictable");
    Console.WriteLine("  SKIP  impossible to write — DateTime.Now is hard-wired inside the endpoint");
    return;
}

app.Run("http://localhost:5018");

record Quote(string Text, string Author);

// The hand-rolled singleton: ONE instance, reachable from anywhere,
// replaceable by nothing. (cs#10 built plug-ins to AVOID exactly this.)
class QuoteRepo
{
    public static readonly QuoteRepo Instance = new();
    private QuoteRepo() { }   // nobody else may construct one — not even a test

    private readonly List<Quote> _quotes = new()
    {
        new Quote("Simplicity is the soul of efficiency.", "Austin Freeman"),
        new Quote("Make it work, make it right, make it fast.", "Kent Beck"),
        new Quote("Programs must be written for people to read.", "Harold Abelson"),
    };

    public List<Quote> All() => _quotes;
    public void Add(Quote quote) => _quotes.Add(quote);
}

class EmailStub
{
    public void Send(string message) => Console.WriteLine($"[email] {message}");
}
