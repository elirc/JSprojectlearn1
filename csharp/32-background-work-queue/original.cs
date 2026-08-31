#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// ============================================================================
// CS 32 — background-work-queue — ORIGINAL
// ============================================================================
// POST /send accepts an email and answers instantly, because "sending" happens
// in the background. The background is `Task.Run(...)` with the result thrown
// away — the most popular two lines of broken code in .NET.
//
// Run:   dotnet run csharp/32-background-work-queue/original.cs
// Then:  curl -X POST http://localhost:5032/send -H "Content-Type: application/json" -d "{\"to\":\"ada@example.com\",\"subject\":\"hi\"}"
//        curl -X POST http://localhost:5032/send -H "Content-Type: application/json" -d "{\"to\":\"not-an-email\",\"subject\":\"oops\"}"
//        curl http://localhost:5032/status
//
// Watch the second one. The server console prints NOTHING. The request got a
// cheerful 200 {"queued":true}. The exception was thrown, caught by nobody,
// attached to a Task nobody kept, and dropped on the floor when the garbage
// collector got round to it. (Before .NET 4.5 an unobserved task exception at
// least killed the process. Now it is silent by default.)

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

int sent = 0;          // mutated from many thread-pool threads at once. Also a bug.

app.MapPost("/send", (EmailRequest req) =>
{
    // ⚠️ THE BUG, in one character: `_ =`. It means "I have a Task here and I
    // am deliberately not keeping it". Nobody awaits it, so nobody ever learns
    // whether the work succeeded, failed, or ran at all.
    _ = Task.Run(async () =>
    {
        await Task.Delay(500);                        // pretend SMTP is slow

        if (!req.To.Contains('@'))
            throw new InvalidOperationException($"'{req.To}' is not an email address");

        sent++;                                        // two threads, one ++, lost counts
        Console.WriteLine($"[background] sent '{req.Subject}' to {req.To}");
    });

    // A 200 that means "we started something". It cannot mean more than that:
    // there is no id, so the caller can never ask what happened. Ever.
    return Results.Ok(new { queued = true });
});

app.MapGet("/status", () => new { sent });

// ---------------------------------------------------------------------------
// Four ways this hurts, in the order you meet them:
//
// 1. EXCEPTIONS VANISH. The bad-address POST above returns 200 and produces no
//    log line, no alert, nothing. The customer never gets the email and the
//    system's own opinion is that everything is fine.
//
// 2. NO STATUS. `{"queued":true}` is the end of the conversation. Nobody can
//    build a "resend" button, a retry, or a support answer to "did it go?".
//
// 3. WORK IS LOST ON SHUTDOWN. Press Ctrl+C during those 500ms and the email
//    is gone — not delayed, not retried, gone, and unrecorded. Deploys do this
//    to a slice of your traffic every single time.
//
// 4. NO LIMIT. Ten thousand requests start ten thousand concurrent Task.Runs,
//    all fighting for the same thread pool as the requests that are still
//    arriving. The queue that would have smoothed this out does not exist:
//    "the background" is not a place, it is a pile.
// ---------------------------------------------------------------------------

app.Run("http://localhost:5032");

record EmailRequest(string To, string Subject);
