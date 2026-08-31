// Program.cs — the three copy-pasted concerns became three middleware
// STATIONS, written once, in order. Requests flow DOWN through them into
// the endpoint; responses flow back UP. Endpoints keep only their real work.
//
// ORDER MATTERS: logging is outermost (sees everything, even 401s),
// timing next (measures everything inside it), the auth gate innermost
// (and only on /admin paths). Swap them and the meaning changes — e.g.
// auth outside logging would make rejected requests invisible in the log.

using System.Diagnostics;

if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// STATION 1 — request logging (was: pasted 5 times, one copy half-missing).
app.Use(async (ctx, next) =>
{
    Console.WriteLine($"--> {ctx.Request.Method} {ctx.Request.Path}");
    await next(ctx);
    Console.WriteLine($"<-- {ctx.Response.StatusCode} {ctx.Request.Method} {ctx.Request.Path}");
});

// STATION 2 — timing (was: pasted 5 times). Response headers must be
// decided before the body starts streaming — like addressing an envelope
// before mailing it — so we register an OnStarting callback that stamps
// the header at the last possible moment.
app.Use(async (ctx, next) =>
{
    var sw = Stopwatch.StartNew();
    ctx.Response.OnStarting(() =>
    {
        ctx.Response.Headers["X-Elapsed"] = TimingFormat.Header(sw.Elapsed);
        return Task.CompletedTask;
    });
    await next(ctx);
});

// STATION 3 — the API-key gate, ONLY for /admin paths (UseWhen = a branch
// in the assembly line). Every /admin endpoint is protected — including
// ones nobody has written yet. The original's forgot-to-paste bug is now
// structurally impossible.
app.UseWhen(
    ctx => PathRules.IsAdmin(ctx.Request.Path),
    admin => admin.Use(async (ctx, next) =>
    {
        if (!ApiKeyChecker.IsValid(ctx.Request.Headers[ApiKeyChecker.HeaderName]))
        {
            ctx.Response.StatusCode = 401;
            await ctx.Response.WriteAsJsonAsync(new { error = "missing or wrong X-Api-Key header" });
            return;   // short-circuit: the endpoint never runs
        }
        await next(ctx);
    }));

// The endpoints — nothing left but the real work (one line each, as it
// always secretly was).
app.MapGet("/status", () => new { status = "ok" });
app.MapGet("/time", () => new { time = DateTime.Now.ToString("HH:mm:ss") });
app.MapGet("/admin/stats", () => new { quotes = 3, uptimeHours = 12 });
app.MapGet("/admin/users", () => new[] { new { name = "ada" }, new { name = "linus" } });
app.MapPost("/admin/reset", () => new { reset = true });

app.Run("http://localhost:5019");
