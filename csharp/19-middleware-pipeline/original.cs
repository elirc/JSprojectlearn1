#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// original.cs — five endpoints, and every one starts with the same three
// copy-pasted blocks: log the request, check the API key, time the handler.
// Fifteen pasted blocks (well... fourteen: one endpoint FORGOT the auth
// check — find the ⚠️). The real work of each endpoint is one line, buried.
//
// Run:   dotnet run csharp/19-middleware-pipeline/original.cs
// Then:  curl http://localhost:5019/status
//        curl -H "X-Api-Key: letmein" http://localhost:5019/admin/stats

using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// ---- public endpoints -----------------------------------------------------

app.MapGet("/status", (HttpContext ctx) =>
{
    Console.WriteLine($"--> GET /status");                                  // logging, copy #1
    var sw = Stopwatch.StartNew();                                          // timing, copy #1
    var result = new { status = "ok" };                                     // the real work
    Console.WriteLine($"<-- 200 GET /status ({sw.ElapsedMilliseconds}ms)");
    return Results.Json(result);
});

app.MapGet("/time", (HttpContext ctx) =>
{
    Console.WriteLine($"--> GET /time");                                    // logging, copy #2
    var sw = Stopwatch.StartNew();                                          // timing, copy #2
    var result = new { time = DateTime.Now.ToString("HH:mm:ss") };          // the real work
    // ...whoever pasted this one forgot the closing log line. Copies drift.
    return Results.Json(result);
});

// ---- admin endpoints (API key required... in theory) -----------------------

app.MapGet("/admin/stats", (HttpContext ctx) =>
{
    Console.WriteLine($"--> GET /admin/stats");                             // logging, copy #3
    var sw = Stopwatch.StartNew();                                          // timing, copy #3
    string? key = ctx.Request.Headers["X-Api-Key"];                         // auth, copy #1
    if (key != "letmein")
    {
        Console.WriteLine($"<-- 401 GET /admin/stats ({sw.ElapsedMilliseconds}ms)");
        return Results.Json(new { error = "wrong key" }, statusCode: 401);
    }
    var result = new { quotes = 3, uptimeHours = 12 };                      // the real work
    Console.WriteLine($"<-- 200 GET /admin/stats ({sw.ElapsedMilliseconds}ms)");
    return Results.Json(result);
});

// ⚠️ THE BUG: whoever added this endpoint copy-pasted from /time (a public
// endpoint) instead of /admin/stats — so the auth block never got pasted in.
// /admin/users is wide open to anyone, and NOTHING in the code complains.
// This is not a hypothetical: "forgot to paste the check" is how real
// security holes are born. Copy-paste has no safety net.
app.MapGet("/admin/users", (HttpContext ctx) =>
{
    Console.WriteLine($"--> GET /admin/users");                             // logging, copy #4
    var sw = Stopwatch.StartNew();                                          // timing, copy #4
    var result = new[] { new { name = "ada" }, new { name = "linus" } };    // the real work
    Console.WriteLine($"<-- 200 GET /admin/users ({sw.ElapsedMilliseconds}ms)");
    return Results.Json(result);
});

app.MapPost("/admin/reset", (HttpContext ctx) =>
{
    Console.WriteLine($"--> POST /admin/reset");                            // logging, copy #5
    var sw = Stopwatch.StartNew();                                          // timing, copy #5
    string? key = ctx.Request.Headers["X-Api-Key"];                         // auth, copy #2
    if (key != "letmein")
    {
        Console.WriteLine($"<-- 401 POST /admin/reset ({sw.ElapsedMilliseconds}ms)");
        // note: a DIFFERENT 401 body than /admin/stats — the copies drifted
        return Results.Json(new { denied = true }, statusCode: 401);
    }
    var result = new { reset = true };                                      // the real work
    Console.WriteLine($"<-- 200 POST /admin/reset ({sw.ElapsedMilliseconds}ms)");
    return Results.Json(result);
});

app.Run("http://localhost:5019");
