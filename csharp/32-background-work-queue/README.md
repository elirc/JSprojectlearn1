# CS 32 — background-work-queue

**Lesson: `Task.Run(...)` with the result thrown away is not "background
work" — it is work with no owner, no status and no shutdown. A `Channel<T>`
plus a hosted service gives you a real queue: the request enqueues and gets
an id, one worker drains it, and every outcome is written down.**

## Run it

```
dotnet run csharp/32-background-work-queue/original.cs
dotnet run --project csharp/32-background-work-queue/refactored
dotnet run --project csharp/32-background-work-queue/refactored -- test
```

Poke it (server running, second terminal — watch the server console too):

```
curl -i -X POST http://localhost:5032/jobs -H "Content-Type: application/json" -d "{\"to\":\"ada@example.com\",\"subject\":\"hi\"}"
curl -i -X POST http://localhost:5032/jobs -H "Content-Type: application/json" -d "{\"to\":\"not-an-email\",\"subject\":\"oops\"}"
curl http://localhost:5032/jobs/<id-from-the-202>   # Queued -> Running -> Succeeded/Failed
curl http://localhost:5032/stats                    # queue depth and status counts
```

Ask for the bad job twice, half a second apart: `Queued`, then `Failed` with
the reason. The original returned `200 {"queued":true}` and lost the error.

## What's wrong with the original?

1. **Exceptions vanish.** `_ = Task.Run(async () => ...)` discards the Task,
   so nobody observes its exception — and since .NET 4.5 an unobserved task
   exception does not even crash the process. POST a malformed address: 200,
   no log line, no email, no record.
2. **No status, ever.** `{"queued": true}` is the end of the conversation. No
   id means no support answer, no retry, no dashboard.
3. **Work is lost on shutdown.** Ctrl+C during the 500ms "send" and the email
   is gone — not delayed, gone, and unrecorded. Every deploy does this.
4. **No limit.** Ten thousand requests start ten thousand concurrent
   `Task.Run`s, competing with the requests still arriving. "The background"
   is not a place, it is a pile. (`sent++` from many threads races, too.)

## What changed in the refactor

- **A bounded `Channel<WorkItem>`** (`WorkQueue`) — .NET's async
  producer/consumer pipe, in the shared framework. Full means `TryEnqueue`
  returns `false` and the endpoint answers 503 instead of piling up work.
- **One `BackgroundService`** (`AddHostedService<EmailWorker>`) drains it with
  `await foreach (... queue.ReadAllAsync(token))`, parked at zero cost when
  the queue is empty — and the host *waits* for it on shutdown.
- **Jobs are a state machine**: `Queued → Running → Succeeded | Failed`, plus
  `Queued → Failed` for a rejection that never ran. Transitions are methods
  on an immutable record that refuse illegal moves.
- **`JobRunner.RunAsync`** marks Running, awaits, and records `Succeed()` or
  `Fail(ex.Message)` — the try/catch the original did not have.
- **POST /jobs → 202 + id + Location; GET /jobs/{id} → the status.** 202 is
  the honest code for "not done yet"; an id is the difference between a
  promise and a receipt.
- **Graceful shutdown**: the writer is completed so nothing new is accepted,
  and anything still `Queued` stays visible instead of evaporating.
- **66 tests, no server**: the state machine, the store (optimistic
  concurrency included), the channel, and failure recording.

## Key takeaway

Fire-and-forget is a decision to have no answers. Work that outlives its
request needs a **queue** (so load has somewhere to wait), a **worker** the
host starts and stops (so shutdown is coordinated), and a **record** of every
outcome (so "did it go?" has an answer). `Channel<T>` + `AddHostedService` +
a job store is the smallest version of that, and the same shape as RabbitMQ,
SQS or Hangfire — those add durability, not ideas.
