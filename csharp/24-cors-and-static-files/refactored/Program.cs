if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);

// Register a ready-made instance (not AddSingleton<QuoteService>()): the
// service also has a test-only IEnumerable<Quote> constructor, and the DI
// container would prefer it — injecting an EMPTY sequence. Constructing the
// instance ourselves keeps the seeded default.
builder.Services.AddSingleton(new QuoteService());

// CORS: opt-in permission for browsers to let OTHER origins call this API.
// This policy says: pages served from http://localhost:5173 (a typical Vite
// dev server — a hypothetical second frontend) may fetch us. Everyone else
// still gets the browser's default wall. Note this protects BROWSER users;
// curl never cared.
builder.Services.AddCors(options =>
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

app.UseDefaultFiles();   // "/" -> wwwroot/index.html
app.UseStaticFiles();    // serve wwwroot/* verbatim: html, js, css, images
app.UseCors("frontend");

// The API lives under /api/ — a clean line between "files the browser loads"
// and "data the frontend fetches". No HTML is built in C# anywhere.
app.MapGet("/api/quotes", (QuoteService svc) => Results.Ok(svc.GetAll()));

app.MapGet("/api/quotes/random", (QuoteService svc) =>
    Results.Ok(svc.Pick(Random.Shared.Next(svc.Count))));   // dice here, decision in the service

app.MapPost("/api/quotes", (NewQuote dto, QuoteService svc) =>
{
    try
    {
        var quote = svc.Add(dto.Text, dto.Author);
        return Results.Created("/api/quotes", quote);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.Run("http://localhost:5024");

public record NewQuote(string? Text, string? Author);
