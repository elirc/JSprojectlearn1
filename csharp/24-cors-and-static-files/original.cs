#:sdk Microsoft.NET.Sdk.Web

// 24 — cors and static files (ORIGINAL, flawed on purpose)
//
// A quotes API that also serves its "frontend"... by gluing an HTML string
// together in C#, one += at a time. Plus: the API sends no CORS headers, so
// a real frontend served from any OTHER origin gets its fetch() calls
// blocked by the browser (the README tells that story).
//
// Run:   dotnet run csharp/24-cors-and-static-files/original.cs
// Try:
//   Open http://localhost:5024/ in a browser and look at quote #3 — the
//   "<blink>" in its text landed in the page as a REAL TAG (view source!),
//   and the "&" became "&mdash;-soup". Data walked into the page as markup.
//   curl http://localhost:5024/quotes
//   curl -X POST "http://localhost:5024/quotes?text=hi&author=me"
//   curl -X POST "http://localhost:5024/quotes?text=<script>alert('hi')</script>"
//        ...then reload the page. Yes. That script tag is IN the page now.

var app = WebApplication.CreateBuilder(args).Build();

var quotes = new List<Quote>
{
    new() { Text = "Simplicity is prerequisite for reliability.", Author = "Edsger Dijkstra" },
    new() { Text = "Deleted code is debugged code.", Author = "Jeff Sickel" },
    // Innocent DATA that happens to contain characters HTML cares about:
    new() { Text = "Use the <blink> tag & never look back", Author = "A 1996 webmaster" },
};

app.MapGet("/", () =>
{
    // Build the page by string concatenation. What could go wrong?
    var html = "<html><head><title>Quote Wall</title></head><body>";
    html += "<h1>Quote Wall</h1><ul>";
    foreach (var q in quotes)
    {
        // q.Text goes STRAIGHT into markup. "<blink>" becomes a real tag;
        // "&" starts an entity; and a user-submitted "<script>" would just
        // ...run. In every visitor's browser. (That's XSS — cross-site
        // scripting — born from exactly this line.)
        html += "<li>" + q.Text + " — <i>" + q.Author + "</i></li>";
    }
    html += "</ul><p>" + quotes.Count + " quotes</p></body></html>";
    return Results.Content(html, "text/html");
});

app.MapGet("/quotes", () => quotes);

app.MapGet("/quotes/random", () => quotes[Random.Shared.Next(quotes.Count)]);

app.MapPost("/quotes", (string? text, string? author) =>
{
    // No validation: empty text sails in and renders as " — <i></i>".
    // And see above for what a <script> payload does.
    quotes.Add(new Quote { Text = text ?? "", Author = author ?? "" });
    return Results.Ok(quotes.Count);
});

// And the second problem, invisible until you split frontend from backend:
// there are NO CORS headers here. This server only gets away with it
// because it serves its own UI from the SAME origin (http://localhost:5024).
// The day the frontend becomes a separate app — a Vite dev server on
// http://localhost:5173, say — every fetch("http://localhost:5024/quotes")
// from that page dies in the browser with:
//
//   Access to fetch at 'http://localhost:5024/quotes' from origin
//   'http://localhost:5173' has been blocked by CORS policy: No
//   'Access-Control-Allow-Origin' header is present on the requested
//   resource.
//
// The refactored version opts that one origin in, on purpose, in one place.

app.Run("http://localhost:5024");

class Quote
{
    public string Text { get; set; } = "";
    public string Author { get; set; } = "";
}
