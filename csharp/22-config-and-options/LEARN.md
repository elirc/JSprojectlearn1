# 📘 Learning Guide: Config & Options

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A "notifier" API that pretends to send email (no real network — a fake SMTP function with deterministic behavior). It has a handful of *settings*: which mail host to use, how many times to retry a failed send, and whether a beta banner shows. The app's actual logic is tiny; the entire lesson is about where those settings **live**.

In the original they live wherever someone happened to type them — including the same setting typed in *two places with two different values*. In the refactor they live in one JSON file, get parsed into one typed C# object, are validated at startup, and can be overridden per-environment without touching code.

Both versions run on `http://localhost:5022`.

## 2. Concepts you need first

### What counts as "configuration"?
Any value that ought to change *without changing code*: hostnames, ports, retry counts, timeouts, feature flags, file paths. The test: "would staging and production want different values?" or "might ops need to change this during an incident?" If yes, it's configuration, and hard-coding it means every change is a code edit + review + redeploy.

### Why hard-coded config rots
The failure mode isn't the first hard-coded value — it's the *second copy* of it. Copies are invisible: nothing in the language says "these two `3`s are the same setting". So when someone changes one during a late-night incident, the other keeps its old value, and now the app disagrees with itself. This project's bug (retry = 3 in one endpoint, 5 in another) is not contrived; it's the standard way this goes.

### `appsettings.json`
ASP.NET Core's conventional settings file, sitting next to your project. The Web SDK loads it automatically — zero code required:

```json
{
  "Notifier": {
    "SmtpHost": "mail.internal.local",
    "RetryCount": 5,
    "BetaBanner": true
  }
}
```

Settings are grouped into **sections** ("Notifier") so related values travel together. (The `Logging` section you'll see in the real file configures ASP.NET Core's own log verbosity — same mechanism, different consumer.)

### Configuration layers: json → environment variables → command line
The genius of the system: configuration is a *stack* of sources, and **later sources override earlier ones**:

1. `appsettings.json` — the defaults, checked into the repo
2. **Environment variables** — per-machine/per-deployment overrides
3. **Command line arguments** — per-launch overrides

An environment variable names a nested setting with a double underscore: `Notifier__RetryCount=7` overrides `Notifier:RetryCount`. On the command line it's `--Notifier:RetryCount=7`. Same key, three places to set it, clear precedence. JS comparison: this is `process.env.RETRY_COUNT ?? config.retryCount ?? 3` — except the framework does the layering uniformly for every setting instead of you hand-writing `??` chains.

Why env vars matter: the *same compiled binary* can run in staging and production with different values. Nothing gets rebuilt; only the environment differs.

### Binding: from JSON to a typed object
Reading settings as loose strings (`Configuration["Notifier:RetryCount"]`) brings back stringly-typed programming — typos compile fine and numbers arrive as text. **Binding** instead copies a whole section onto a C# object's properties, converting types along the way:

```csharp
public record NotifierOptions
{
    public string SmtpHost { get; init; } = "";
    public int RetryCount { get; init; } = 3;   // default if config omits it
    public bool BetaBanner { get; init; }
}

builder.Services.Configure<NotifierOptions>(builder.Configuration.GetSection("Notifier"));
```

After that one line, the section *is* a `NotifierOptions` as far as the app cares. A record with `init` properties (project 07) fits perfectly: built once at startup, immutable afterwards.

### `IOptions<T>`: consuming settings via DI
`Configure<T>` registers the bound object with the DI container (project 18). Anything that wants settings *asks* for them:

```csharp
app.MapPost("/send", (string to, IOptions<NotifierOptions> opt) =>
{
    var settings = opt.Value;    // the ONE NotifierOptions instance
    ...
});
```

`IOptions<T>` is a tiny wrapper whose `.Value` is your bound object (the wrapper exists because fancier variants — `IOptionsSnapshot`, `IOptionsMonitor` — can reload settings while running; `IOptions` is the simple always-the-same-value one, and it's all we need). The needed `using Microsoft.Extensions.Options;` is the one namespace here that isn't auto-imported.

### Validating configuration at startup ("fail fast")
Config files are edited by humans, which makes config *user input* — it can be nonsense. `"RetryCount": -1` binds happily; `int` is `int`. If nothing checks it, the first symptom appears at runtime, far from the cause.

The cure is a validation step that runs **at startup**: check every rule, and if anything's wrong, refuse to start with a message naming the exact setting. A deploy that dies in two seconds with `Notifier:RetryCount must be at least 1 (got -1)` is a good deploy — the broken one is the one that starts fine and quietly never retries. This is js#31's validator idea pointed at your own settings.

### Feature flags
A **feature flag** is a boolean setting that switches behavior on/off (`BetaBanner` here). Flags are the config values that change most often — which is exactly why they can't be hard-coded: the entire point of a flag is flipping it *without* a deploy.

## 3. Walking through the original code

Three endpoints, three private stashes of "the" settings:

```csharp
app.MapPost("/send", (string to) =>
{
    var smtpHost = "mail.internal.local";   // copy #1 of the host
    var retries = 3;                        // copy #1 of "the" retry setting
    return Results.Ok(FakeSmtp.Send(smtpHost, to, retries));
});
```

```csharp
app.MapPost("/send-bulk", (string[] to) =>
{
    var smtpHost = "mail.internal.local";   // copy #2
    var retries = 5;                        // copy #2 — DRIFTED
    ...
});
```

The comments in the file tell the (fictional but standard) history: bulk was copy-pasted from send, then "tuned" during an incident. Nobody was wrong, exactly. There was just no single place where the truth lived, so two truths grew.

`/status` adds a third copy claiming `retryCount = 3`, and `/banner` + `/status` each keep their own `betaBanner` copy — currently equal, waiting for their turn to drift.

`FakeSmtp.Send` is worth a look because it makes the drift *visible*: addresses containing `"flaky"` succeed only on attempt 5. So with 3 retries, flaky mail fails; with 5, it delivers. Same address, opposite outcomes, depending on which endpoint you use. Users will report this as "email is haunted".

## 4. What's wrong with it (in beginner terms)

**1. Two values, both claiming to be the setting.** When `/send` gives up after 3 tries and `/send-bulk` succeeds on try 5, which behavior is "correct"? There is no answer, because there's no single definition to check. That's the deepest damage of duplicated config: not the wrong value, but the *loss of a source of truth*.

**2. `/status` lies.** Its numbers are copies too, so it reports what its author believed, not what the app does. Dashboards built on it inherit the fiction.

**3. Every settings change is a deploy.** New mail host? Edit three lines (find them first!), rebuild, redeploy. During an incident, that's a long path — which is exactly when someone edits only one copy and mints a new drift.

**4. One environment fits all.** Hard-coded values mean staging talks to the production mail host unless someone maintains a diverging copy of the code. Both options are bad.

**5. Nothing guards the values.** Nonsense compiles. And once config moves to a file (as it should), a `-1` typed at 2am binds silently unless validation exists.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 Count the hard-coded settings in the file. How many *distinct* settings are there really? (Three.) Where could each live so it exists exactly once?
2. 🌿 Create `appsettings.json` with a `Notifier` section holding `SmtpHost`, `RetryCount`, `BetaBanner`. Define a `record NotifierOptions` matching it.
3. 🌳 Bind with `builder.Services.Configure<NotifierOptions>(builder.Configuration.GetSection("Notifier"))`, and change every endpoint to take an `IOptions<NotifierOptions>` parameter (add `using Microsoft.Extensions.Options;`).
4. 🍎 Give the record a `Validate()` method returning a `List<string>` of errors (blank host, retries out of range). Call it right after `builder.Build()` and throw if anything comes back. Then write tests for `Validate()` — it's a pure method, no server needed.

## 6. Understanding the refactored solution

**`appsettings.json`** — the three settings, once each, in a named section. This file is the answer to "what does this app think the retry count is?" — you *look it up*, you don't grep code.

**`NotifierOptions.cs`** — the typed mirror of that section. Defaults live on the properties (`RetryCount` falls back to 3 if config omits it). And the validation:

```csharp
public IReadOnlyList<string> Validate()
{
    var errors = new List<string>();
    if (string.IsNullOrWhiteSpace(SmtpHost))
        errors.Add("Notifier:SmtpHost must not be empty");
    if (RetryCount < 1)
        errors.Add($"Notifier:RetryCount must be at least 1 (got {RetryCount})");
    if (RetryCount > 10)
        errors.Add($"Notifier:RetryCount above 10 is almost certainly a typo (got {RetryCount})");
    return errors;
}
```

Details worth stealing: errors *name the setting* using config-key syntax (`Notifier:RetryCount`) so the reader knows exactly what to fix; all problems are collected and reported together (not one-at-a-time); and there's an upper bound, because 5000 retries is never intentional.

**`Program.cs`** — one bind line, one fail-fast check:

```csharp
builder.Services.Configure<NotifierOptions>(builder.Configuration.GetSection("Notifier"));
var app = builder.Build();

var options = app.Services.GetRequiredService<IOptions<NotifierOptions>>().Value;
var configErrors = options.Validate();
if (configErrors.Count > 0)
    throw new InvalidOperationException("Bad configuration: " + string.Join("; ", configErrors));
```

Then every endpoint consumes `opt.Value.*`. Look at `/status` now:

```csharp
app.MapGet("/status", (IOptions<NotifierOptions> opt) => Results.Ok(opt.Value));
```

It can't lie — it returns the very object the other endpoints read. Truthful status endpoints aren't a virtue you add; they're what happens when there's only one copy to report.

**`FakeSmtp.cs`** — unchanged logic, extracted to its own file because it's pure and deserves tests. The tests encode the whole bug story: flaky fails at 3 retries, succeeds at 5 — so whoever next "tunes" retry behavior does it against a test suite that explains the stakes.

## 7. Words you learned (glossary)

- **Configuration** — values meant to change without code changes (hosts, flags, limits).
- **Configuration drift** — duplicated settings evolving apart until the app disagrees with itself.
- **Single source of truth** — each fact stored exactly once; everything else references it.
- **`appsettings.json`** — ASP.NET Core's auto-loaded settings file.
- **Section** — a named group of settings (`"Notifier": { ... }`), addressed as `Notifier:RetryCount`.
- **Configuration layers** — json file → environment variables → command line; later overrides earlier.
- **Environment variable override** — `Notifier__RetryCount=7` (double underscore = section separator).
- **Binding** — copying a config section onto a typed object's properties.
- **`Configure<T>` / `IOptions<T>`** — register the bound options / receive them via DI (`.Value`).
- **`init` property** — settable only during construction (project 07); right for settings.
- **Fail fast** — detect bad state at startup and refuse to run, loudly and specifically.
- **Feature flag** — a boolean setting that toggles behavior without a deploy.
- **Stringly-typed** — passing typed data around as raw strings; what binding rescues you from.

## 8. Experiments to try on the plane (no internet needed)

Everything below is localhost + local process environment — fully offline.

1. **See the drift with your own eyes (original).** Start the original, then:
   `curl -X POST "http://localhost:5022/send?to=flaky@team.local"` → `"delivered": false` after 3 attempts.
   `curl -X POST "http://localhost:5022/send-bulk?to=flaky@team.local"` → `"delivered": true` on attempt 5.
   `curl http://localhost:5022/status` → claims retryCount 3. Three answers, one setting.
2. **Override without editing anything (refactored).** PowerShell: `$env:Notifier__RetryCount = "2"` then start the refactored server and send to flaky → fails after 2 attempts; `/status` truthfully reports 2. Clean up with `Remove-Item Env:Notifier__RetryCount`. (bash: `Notifier__RetryCount=2 dotnet run --project csharp/22-config-and-options/refactored`.)
3. **Watch fail-fast save you.** Set `$env:Notifier__RetryCount = "-1"` and start the refactored server. Expected: it dies immediately with `Bad configuration: Notifier:RetryCount must be at least 1 (got -1)`. Now imagine the alternative: a server that starts fine and never retries anything. Which failure would you rather debug? (Clean up the env var after.)
4. **Try the third layer.** `dotnet run --project csharp/22-config-and-options/refactored -- --Notifier:BetaBanner=false` then `curl http://localhost:5022/banner`. Expected: the calm message. Command line beat the json file — and if the env var from experiment 2 were still set, the command line would beat that too.
5. **Add a setting end-to-end.** Add `"SenderName": "Robo Mailer"` to the json section, a `SenderName` property to the record, a validation rule (non-empty), a test for the rule, and include it in `/send`'s report. Expected: `-- test` green, `/status` shows it automatically (it returns the whole object). Count the copies of the value in code afterward: still one — in the config file, where it belongs.
6. **Break validation and catch it in tests.** Delete the `RetryCount < 1` check and run `-- test`. Expected: two FAILs naming the negative/zero retry tests. The validation rules themselves are code, and code gets tests.
