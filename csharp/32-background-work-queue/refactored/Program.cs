if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Program.cs — accept work, hand it to a queue, tell the caller where to look.
// The endpoints do no work at all: POST writes one item to a channel and
// returns an id. The worker in EmailWorker.cs does the rest, and writes down
// what happened either way.
//
// Run:   dotnet run --project csharp/32-background-work-queue/refactored
// Test:  dotnet run --project csharp/32-background-work-queue/refactored -- test

var builder = WebApplication.CreateBuilder(args);

// One store and one queue for the whole app: the endpoints write to them, the
// worker reads from them, and the DI container is what introduces the two.
builder.Services.AddSingleton<JobStore>();
builder.Services.AddSingleton(new WorkQueue(capacity: 100));
builder.Services.AddSingleton<IEmailSender, FakeSmtpSender>();

// AddHostedService = "start this when the app starts, stop it when the app
// stops, and WAIT for it to finish stopping". That last clause is the whole
// difference from Task.Run: shutdown is something the worker takes part in.
builder.Services.AddHostedService<EmailWorker>();

var app = builder.Build();

// POST /jobs -> 202 Accepted + an id. 202 is the honest status code for "I
// have not done this yet": it means accepted for processing, and the Location
// header says where to watch it. (The original returned 200 — "done" — for
// work that had not started.)
app.MapPost("/jobs", (EmailRequest req, JobStore store, WorkQueue queue) =>
{
    if (string.IsNullOrWhiteSpace(req.To))
        return Results.BadRequest(new { error = "to is required" });

    // Note we do NOT check the address here, on purpose: leaving one bad
    // address to fail inside the worker is how the demo shows a failure being
    // recorded. A real API would validate at the edge as well (cs#17).
    var job = store.Add(req.To.Trim(), string.IsNullOrWhiteSpace(req.Subject) ? "(no subject)" : req.Subject.Trim());

    if (!queue.TryEnqueue(new WorkItem(job.Id, job.To, job.Subject)))
    {
        // The queue is full. Say so, record it, and let the caller retry —
        // instead of quietly starting a 101st concurrent Task.
        var rejected = store.Update(job.Id, j => j.Reject("queue full"));
        return Results.Json(new { id = job.Id, status = rejected?.Status.ToString(), error = "queue full, retry shortly" },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    return Results.Accepted($"/jobs/{job.Id}", View(job));
});

// GET /jobs/{id} -> the answer to "did it go?", which the original could
// never give.
app.MapGet("/jobs/{id}", (string id, JobStore store) =>
    store.TryGet(id, out var job)
        ? Results.Ok(View(job))
        : Results.NotFound(new { error = $"no job '{id}'" }));

app.MapGet("/jobs", (JobStore store) => store.All().Select(View));

app.MapGet("/stats", (JobStore store, WorkQueue queue) => new
{
    queueDepth = queue.Depth,
    queueCapacity = queue.Capacity,
    total = store.Count,
    queued = store.CountByStatus(JobStatus.Queued),
    running = store.CountByStatus(JobStatus.Running),
    succeeded = store.CountByStatus(JobStatus.Succeeded),
    failed = store.CountByStatus(JobStatus.Failed),
});

app.Run("http://localhost:5032");

// The wire shape of a job: the enum spelled out, so clients read "Succeeded"
// instead of guessing what 2 means.
static object View(Job job) => new
{
    id = job.Id,
    to = job.To,
    subject = job.Subject,
    status = job.Status.ToString(),
    error = job.Error,
    attempts = job.Attempts,
    queuedAt = job.QueuedAt,
};
