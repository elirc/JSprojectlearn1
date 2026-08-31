#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// original.cs — a signup endpoint that does the framework's job by hand:
// it reads the raw body stream, parses the JSON itself, digs out each field,
// and validates with early returns — a different error shape (all 200 OK!)
// at every exit. A second endpoint hand-parses query strings with int.Parse.
//
// Run:   dotnet run csharp/17-model-binding-validation/original.cs
// Then:  curl -X POST http://localhost:5017/signup -H "Content-Type: application/json" -d "{}"

using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapPost("/signup", async (HttpRequest req) =>
{
    // Step 1: read and parse the body OURSELVES (the framework would have
    // happily done this — see js#65, where we had no choice).
    JsonDocument doc;
    try
    {
        doc = await JsonDocument.ParseAsync(req.Body);
    }
    catch (JsonException)
    {
        return Results.Json(new { ok = false, problem = "body was not valid json" }); // 200!
    }

    using (doc)
    {
        var root = doc.RootElement;

        // Step 2: dig out each field by hand and bail at the FIRST problem.
        // Error shape #1: { ok, problem }
        if (!root.TryGetProperty("email", out var emailProp) || emailProp.ValueKind != JsonValueKind.String)
            return Results.Json(new { ok = false, problem = "no email" });              // 200!

        var email = emailProp.GetString()!;
        // Error shape #2: { error } — a different author, a different day
        if (!email.Contains("@") || email.StartsWith("@") || email.EndsWith("@"))
            return Results.Json(new { error = "email looks wrong" });                   // 200!

        if (!root.TryGetProperty("password", out var passProp) || passProp.ValueKind != JsonValueKind.String)
            return Results.Json(new { ok = false, problem = "no password" });           // 200!

        var password = passProp.GetString()!;
        // Error shape #3: { signup_failed, why } — yet another invention
        if (password.Length < 8)
            return Results.Json(new { signup_failed = true, why = "password too short" }); // 200!

        if (!root.TryGetProperty("age", out var ageProp))
            return Results.Json(new { ok = false, problem = "no age" });                // 200!

        // GetInt32 throws if the client sent "age": "thirty" or 29.5 —
        // discovered in production, "fixed" with this try/catch.
        int age;
        try
        {
            age = ageProp.GetInt32();
        }
        catch (Exception)
        {
            return Results.Json(new { ok = false, problem = "age was not a whole number" }); // 200!
        }

        if (age < 13)
            return Results.Json(new { signup_failed = true, why = "too young" });       // 200!

        // Note what first-error-wins does to a user who got EVERYTHING wrong:
        // fix email → submit → "no password" → fix → submit → "too short" →
        // fix → submit → "too young". Four round trips to see four problems.
        return Results.Json(new { ok = true, message = $"welcome, {email}" });
    }
});

app.MapGet("/discount", (HttpRequest req) =>
{
    // Hand-parsing the query string. int.Parse THROWS on "?age=abc" — the
    // first version of this endpoint answered 500 until someone wrapped the
    // whole thing in this blanket try/catch.
    string? raw = req.Query["age"];
    try
    {
        var age = int.Parse(raw!);
        var percent = 0;
        if (age < 18) percent = 20;
        if (age >= 65) percent = 30;
        return Results.Json(new { age, percent });
    }
    catch (Exception)
    {
        return Results.Json(new { error = "bad age" });                                 // 200!
    }
});

app.Run("http://localhost:5017");
