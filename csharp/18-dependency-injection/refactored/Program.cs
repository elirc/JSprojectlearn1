// Program.cs — the COMPOSITION ROOT: the one place that decides which real
// implementation each interface gets. Everywhere else just declares needs.

if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);

// Register once, in one place. Lifetimes:
//   Singleton — ONE instance for the whole app (the repo HOLDS our data,
//               so it must be shared; same for the clock and notifier).
//   Scoped    — one instance PER REQUEST (fits per-request workers like
//               QuoteService; see LEARN.md for the story).
//   Transient — a fresh instance EVERY time anyone asks.
builder.Services.AddSingleton<IQuoteRepo>(new InMemoryQuoteRepo(new[]
{
    new Quote("Simplicity is the soul of efficiency.", "Austin Freeman"),
    new Quote("Make it work, make it right, make it fast.", "Kent Beck"),
    new Quote("Programs must be written for people to read.", "Harold Abelson"),
}));
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<INotifier, ConsoleNotifier>();
builder.Services.AddScoped<QuoteService>();

var app = builder.Build();

// Endpoints DECLARE what they need as parameters; the container supplies it.
// No statics, no `new` — swap a registration above and every endpoint
// changes behavior without editing a single line below.
app.MapGet("/quotes", (QuoteService svc) => svc.All());

app.MapGet("/quotes/daily", (QuoteService svc) =>
    svc.Daily() is Quote q ? Results.Ok(q) : Results.NotFound());

app.MapPost("/quotes", (QuoteService svc, QuoteInput body) =>
    svc.Add(body.Text, body.Author) is Quote q
        ? Results.Created("/quotes", q)
        : Results.BadRequest(new { error = "text must not be empty" }));

app.Run("http://localhost:5018");
