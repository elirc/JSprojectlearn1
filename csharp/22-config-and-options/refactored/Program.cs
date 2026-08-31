using Microsoft.Extensions.Options;

if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);

// Bind the "Notifier" section of configuration to the NotifierOptions record.
// CreateBuilder already stacked the layers for us: appsettings.json, then
// environment variables (Notifier__RetryCount=7), then command line
// (--Notifier:RetryCount=7) — later layers override earlier ones.
builder.Services.Configure<NotifierOptions>(builder.Configuration.GetSection("Notifier"));

var app = builder.Build();

// Fail fast: validate config at startup. A bad value stops the app HERE,
// with a message naming the exact setting — not at 2am mid-request.
var options = app.Services.GetRequiredService<IOptions<NotifierOptions>>().Value;
var configErrors = options.Validate();
if (configErrors.Count > 0)
    throw new InvalidOperationException("Bad configuration: " + string.Join("; ", configErrors));

// Endpoints ASK for the options via DI — no endpoint owns a private copy of
// any setting, so drift is structurally impossible.
app.MapGet("/banner", (IOptions<NotifierOptions> opt) => Results.Ok(new
{
    message = opt.Value.BetaBanner
        ? "[BETA] New notification engine enabled — expect rough edges!"
        : "Notifications are up.",
}));

app.MapPost("/send", (string to, IOptions<NotifierOptions> opt) =>
    Results.Ok(FakeSmtp.Send(opt.Value.SmtpHost, to, opt.Value.RetryCount)));

app.MapPost("/send-bulk", (string[] to, IOptions<NotifierOptions> opt) =>
    Results.Ok(to.Select(addr => FakeSmtp.Send(opt.Value.SmtpHost, addr, opt.Value.RetryCount)).ToList()));

// /status can't lie anymore: it returns THE options object — the same one
// every endpoint uses.
app.MapGet("/status", (IOptions<NotifierOptions> opt) => Results.Ok(opt.Value));

app.Run("http://localhost:5022");
