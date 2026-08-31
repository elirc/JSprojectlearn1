# CS 19 — middleware-pipeline

**Lesson: cross-cutting concerns (logging, auth, timing) belong in the
pipeline — written once as middleware stations, not pasted into every
endpoint. Copy-paste has no safety net; structure does.**

## Run it

```
dotnet run csharp/19-middleware-pipeline/original.cs
dotnet run --project csharp/19-middleware-pipeline/refactored
dotnet run --project csharp/19-middleware-pipeline/refactored -- test
```

Poke it (server running, second terminal — watch the server console log too):

```
curl -i http://localhost:5019/status                                  # public; note the X-Elapsed header
curl -i http://localhost:5019/admin/stats                             # 401 — no key
curl -i -H "X-Api-Key: letmein" http://localhost:5019/admin/stats     # 200
curl -i http://localhost:5019/admin/users                             # refactored: 401. ORIGINAL: 200 — the bug!
curl -i -X POST -H "X-Api-Key: letmein" http://localhost:5019/admin/reset
```

## What's wrong with the original?

Five endpoints; each starts with the same three pasted blocks — log the
request, check `X-Api-Key`, time the handler. The real work of every
endpoint is one line, buried under ten lines of ceremony. And the copies
are already rotting:

1. **`/admin/users` forgot the auth block** — pasted from a public endpoint
   instead of an admin one. It's wide open, and nothing in the code
   complains. This is *the* classic copy-paste security hole.
2. **The copies drifted**: `/time` lost its closing log line; the two 401
   bodies disagree (`{"error":"wrong key"}` vs `{"denied":true}`).
3. Want to change the log format or the auth rule? That's five (or two, or
   four — who's counting?) edits, every time, forever.

## What changed in the refactor

Three tiny **middleware** stations, declared once, in order:

1. **Logging** — `app.Use(...)`: logs `-->` on the way in, `<--` with the
   status on the way out. Outermost, so it sees *everything*, 401s included.
2. **Timing** — starts a `Stopwatch`, registers `Response.OnStarting` to
   stamp an `X-Elapsed` header just before the response begins streaming.
3. **API-key gate** — `app.UseWhen(PathRules.IsAdmin(path), ...)`: only
   `/admin` paths pass through it; a bad key short-circuits with one
   consistent 401 body and the endpoint never runs.

Endpoints shrink to their real work (`() => new { status = "ok" }`). The
decisions live in pure classes — `ApiKeyChecker.IsValid`,
`PathRules.IsAdmin`, `TimingFormat.Header` — each fully unit-tested,
including `/administrator` NOT counting as admin. And the forgotten-auth
bug is now *structurally impossible*: any future `/admin/whatever` endpoint
is protected the moment it's mapped.

## Key takeaway

When the same block opens every handler, it isn't the handler's job — it's
the pipeline's. Middleware turns "remember to paste the check" into "the
check is simply there," and pipeline *order* (log → time → gate → endpoint)
becomes a single visible policy instead of five private guesses.
