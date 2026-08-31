#:sdk Microsoft.NET.Sdk.Web

// 22 — configuration (ORIGINAL, flawed on purpose)
//
// A "notifier" API that pretends to send email. Every setting it needs —
// SMTP host, retry count, feature flag — is hard-coded right where it's
// used... and some of them are hard-coded in TWO places, with values that
// have drifted apart. Nobody decided that. It just happened, one copy-paste
// at a time.
//
// Run:   dotnet run csharp/22-config-and-options/original.cs
// Try:
//   curl http://localhost:5022/banner
//   curl -X POST "http://localhost:5022/send?to=alice@team.local"
//   curl -X POST "http://localhost:5022/send?to=flaky@team.local"       -> delivered: false (gave up after 3)
//   curl -X POST "http://localhost:5022/send-bulk?to=flaky@team.local"  -> delivered: TRUE  (kept trying, 5)
//   curl http://localhost:5022/status    -> reports retryCount 3... for a server that sometimes uses 5
//
// THE BUG: /send retries 3 times, /send-bulk retries 5 times. Both numbers
// are "the retry setting". The same flaky address is undeliverable through
// one endpoint and fine through the other, and /status swears the answer
// is 3. Which one is right? Nobody knows — there is no single source of
// truth to consult.

var app = WebApplication.CreateBuilder(args).Build();

app.MapGet("/banner", () =>
{
    bool betaBanner = true;   // feature flag, hard-coded (copy #1 of 2 — /status has its own)
    return Results.Ok(new
    {
        message = betaBanner
            ? "[BETA] New notification engine enabled — expect rough edges!"
            : "Notifications are up.",
    });
});

app.MapPost("/send", (string to) =>
{
    // Settings hard-coded exactly where they're needed. Convenient today...
    var smtpHost = "mail.internal.local";   // copy #1 of the host
    var retries = 3;                        // copy #1 of "the" retry setting
    return Results.Ok(FakeSmtp.Send(smtpHost, to, retries));
});

app.MapPost("/send-bulk", (string[] to) =>
{
    // ...copy-pasted here six weeks later, then "tuned" during an incident.
    // Nobody remembered /send has its own copy. Now there are two truths.
    var smtpHost = "mail.internal.local";   // copy #2 of the host (same — for now)
    var retries = 5;                        // copy #2 of "the" retry setting — DRIFTED
    return Results.Ok(to.Select(addr => FakeSmtp.Send(smtpHost, addr, retries)).ToList());
});

app.MapGet("/status", () =>
{
    // A THIRD set of copies, so /status can "report the settings".
    // It reports what it believes, not what the endpoints actually do.
    return Results.Ok(new
    {
        smtpHost = "mail.internal.local",
        retryCount = 3,        // lies about /send-bulk
        betaBanner = true,     // copy #2 of the flag — will drift like retries did
    });
});

// To change the SMTP host you now edit THREE lines in this file and
// redeploy. To use a different host on the staging server... you can't.
// Same binary, same hard-coded values, everywhere it runs.

app.Run("http://localhost:5022");

static class FakeSmtp
{
    // Pretend mailer (no network, no real SMTP): addresses containing
    // "flaky" only succeed on the 5th attempt; everyone else succeeds
    // immediately. Deterministic on purpose, so the retry-count drift
    // is OBSERVABLE: 3 retries -> flaky fails, 5 retries -> flaky works.
    public static SendReport Send(string host, string to, int maxAttempts)
    {
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            bool delivered = !to.Contains("flaky") || attempt >= 5;
            if (delivered) return new SendReport(to, host, attempt, true);
        }
        return new SendReport(to, host, maxAttempts, false);
    }
}

record SendReport(string To, string Host, int Attempts, bool Delivered);
