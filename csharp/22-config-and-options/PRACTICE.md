# 🏋️ Practice: Configuration & Options

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. A host is not a URL (warm-up)

`SmtpHost` is a bare host name like `mail.internal.local`, but nothing stops someone pasting `smtp://mail.internal.local` or `https://mail.internal.local:25` into `appsettings.json` — a mistake that would fail at *send* time, deep in a stack trace, hours after the deploy. Add a rule to `NotifierOptions.Validate()` rejecting any host containing `"://"`, naming the setting and quoting the bad value like the existing messages do.
*Practices:* the pure domain layer — config is user input, and validation rules are ordinary tested code.
**Hint:** one `if` next to the blank-host check. Keep the two rules separate so a blank host and a URL host produce distinguishable errors.
**Check offline:** add these Check tests to `Tests.cs` — both should pass:
```csharp
var urlHost = new NotifierOptions { SmtpHost = "smtp://mail.internal.local", RetryCount = 3 };
Check.Equal(1, urlHost.Validate().Count, "a URL where a host name belongs is rejected");
Check.True(urlHost.Validate()[0].Contains("SmtpHost"), "and the error names the setting");
```

### ⭐⭐ 2. A nested section (core)

Give the notifier a rate limit: add `"Throttle": { "PerMinute": 30, "BurstSize": 60 }` inside the `Notifier` section of `appsettings.json`, a `record ThrottleOptions` with those two `init` properties, and a `ThrottleOptions Throttle { get; init; } = new();` property on `NotifierOptions`. Binding walks nested objects automatically. Validate that `PerMinute >= 1` and `BurstSize >= PerMinute`, and confirm the nested value can still be overridden from the environment.
*Practices:* hierarchical configuration, nested binding, and the `__` / `:` path syntax.
**Hint:** `= new()` on the nested property is what stops it being `null` when the section is missing — binding fills the existing instance. The env-var path is `Notifier__Throttle__PerMinute` (two underscores per `:` level); the command-line form is `--Notifier:Throttle:PerMinute=45`.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var sane = new NotifierOptions { SmtpHost = "mail.internal.local", RetryCount = 3,
    Throttle = new ThrottleOptions { PerMinute = 30, BurstSize = 60 } };
Check.Equal(0, sane.Validate().Count, "a sane throttle passes");
var upsideDown = new NotifierOptions { SmtpHost = "mail.internal.local", RetryCount = 3,
    Throttle = new ThrottleOptions { PerMinute = 100, BurstSize = 10 } };
Check.Equal(1, upsideDown.Validate().Count, "a burst smaller than the steady rate is nonsense");
Check.True(upsideDown.Validate()[0].Contains("Throttle:BurstSize"), "the error names the nested path");
```
Then, with the server running, `curl http://localhost:5022/status` shows the nested object; restart with `$env:Notifier__Throttle__PerMinute = "45"` and `/status` reports `45`.

### ⭐⭐ 3. A configured list (core)

Add `"Recipients": [ "ops@team.local", "oncall@team.local" ]` to the section and a `string[] Recipients { get; init; } = Array.Empty<string>();` property. Validate that the list is non-empty and contains no blank entries. Then make `POST /send-bulk` fall back to the configured recipients when the caller passes no `to` values — "who gets the nightly digest" is configuration, not a query string.
*Practices:* binding JSON arrays, indexed override paths, and choosing a sane fallback.
**Hint:** arrays bind by index, so a single recipient can be replaced from the environment with `Notifier__Recipients__0=me@team.local` — indexes you don't override keep their file values. In the endpoint, `to is { Length: > 0 } ? to : opt.Value.Recipients` picks the caller's list or the default.
**Check offline:** add to `Tests.cs` — all should pass:
```csharp
var noOne = new NotifierOptions { SmtpHost = "mail.internal.local", RetryCount = 3, Recipients = Array.Empty<string>() };
Check.Equal(1, noOne.Validate().Count, "an empty recipient list is rejected");
var blankOne = new NotifierOptions { SmtpHost = "mail.internal.local", RetryCount = 3,
    Recipients = new[] { "ops@team.local", "   " } };
Check.Equal(1, blankOne.Validate().Count, "a blank entry in the list is rejected");
Check.True(blankOne.Validate()[0].Contains("Recipients"), "and the error names the list");
```
Then `curl -X POST http://localhost:5022/send-bulk` (no query string at all) → one report per configured recipient.

### ⭐⭐ 4. Let the framework fail fast for you (core)

`Program.cs` validates by hand: resolve `IOptions<T>`, call `Validate()`, throw. .NET has a pipeline for exactly this. Replace those lines with `builder.Services.AddOptions<NotifierOptions>().Bind(builder.Configuration.GetSection("Notifier")).Validate(...).ValidateOnStart();` so the check runs during startup, before the first request, with the framework reporting it.
*Practices:* `AddOptions<T>()`'s fluent builder, and the difference between validating when *you* remember and validating as part of the host's startup contract.
**Hint:** `Validate` takes a `Func<TOptions, bool>` plus a *fixed* failure message, so pass `o => o.Validate().Count == 0` — your pure rule stays the source of truth and stays unit-tested. Because the message is a constant, it cannot list the individual errors; that detail is what your `Validate()` tests already cover. `.Bind(...)` replaces the old `Configure<T>(...)` call, and both the manual `IOptions<T>` lookup and the hand-written `throw` come out.
**Check offline:** every existing test still passes (the rules never moved), and `$env:Notifier__RetryCount = "-1"` then `dotnet run --project csharp/22-config-and-options/refactored` still refuses to start — now with an `OptionsValidationException` naming `NotifierOptions`. (`Remove-Item Env:Notifier__RetryCount` afterwards.)

### ⭐⭐⭐ 5. Settings that change without a restart (challenge)

`IOptions<T>` is resolved once and frozen for the life of the app — fine for a retry count, wrong for a feature flag you want to flip during an incident. Switch `/banner` to inject `IOptionsMonitor<NotifierOptions>` and read `opt.CurrentValue`, then add `appsettings.Development.json` with `"BetaBanner": true` to see environment layering on top of the base file. Explain to yourself why `/send` should probably *keep* `IOptions`.
*Practices:* the three options interfaces (`IOptions` / `IOptionsSnapshot` / `IOptionsMonitor`), `reloadOnChange`, and per-environment configuration files.
**Hint:** `CreateBuilder` already loads `appsettings.json` then `appsettings.{Environment}.json` with `reloadOnChange: true`, so no wiring is needed — only the interface changes. Edit the `appsettings.json` **in the project folder** (`dotnet run` uses it as the content root), not the copy under `bin/`.
**Check offline:** start the server and `curl http://localhost:5022/banner` → the `[BETA]` message. Without stopping it, edit `refactored/appsettings.json` to `"BetaBanner": false`, save, and curl again → the calm message, no restart. Then set `$env:ASPNETCORE_ENVIRONMENT = "Development"`, restart, and `curl http://localhost:5022/banner` → `[BETA]` again, because the Development file layered over the base one. (`Remove-Item Env:ASPNETCORE_ENVIRONMENT` afterwards.)

## Solutions

### 1. A host is not a URL

```csharp
// NotifierOptions.cs — inside Validate(), next to the blank-host rule
if (SmtpHost.Contains("://"))
    errors.Add($"Notifier:SmtpHost must be a bare host name, not a URL (got '{SmtpHost}')");
```

WHY: the value came from a human editing a file or typing an environment variable, so it deserves the same suspicion as a form field — and catching it at startup converts a confusing 2am send failure into a five-second deploy failure that names the setting. Keeping it a separate `if` rather than an `else if` matters because `Validate()` reports *all* problems at once; the existing "multiple problems are ALL reported" test is the reason that habit survives.

### 2. A nested section

```jsonc
// appsettings.json
"Notifier": {
  "SmtpHost": "mail.internal.local",
  "RetryCount": 5,
  "BetaBanner": true,
  "Throttle": { "PerMinute": 30, "BurstSize": 60 }
}
```

```csharp
// NotifierOptions.cs
public record ThrottleOptions
{
    public int PerMinute { get; init; } = 60;
    public int BurstSize { get; init; } = 120;
}

public record NotifierOptions
{
    public string SmtpHost { get; init; } = "";
    public int RetryCount { get; init; } = 3;
    public bool BetaBanner { get; init; }
    public ThrottleOptions Throttle { get; init; } = new();   // never null, even if the section is absent

    public IReadOnlyList<string> Validate()
    {
        var errors = new List<string>();
        // ... existing rules ...
        if (Throttle.PerMinute < 1)
            errors.Add($"Notifier:Throttle:PerMinute must be at least 1 (got {Throttle.PerMinute})");
        if (Throttle.BurstSize < Throttle.PerMinute)
            errors.Add($"Notifier:Throttle:BurstSize ({Throttle.BurstSize}) must be at least PerMinute ({Throttle.PerMinute})");
        return errors;
    }
}
```

WHY: configuration is a flat dictionary of `Key:Sub:Sub` strings underneath — the JSON nesting, the `__` in environment variables and the `:` on the command line are three spellings of the same path, which is why `Notifier__Throttle__PerMinute` reaches a property two levels down without any extra code. The `= new()` default is load-bearing: binding *populates* the object already sitting in the property, so without it a missing `Throttle` section leaves you a `null` to trip over at the worst moment. Grouping related settings also keeps the validation honest — `BurstSize >= PerMinute` is a rule *between* two settings, and it has an obvious home now.

### 3. A configured list

```csharp
// NotifierOptions.cs
public string[] Recipients { get; init; } = Array.Empty<string>();

// inside Validate()
if (Recipients.Length == 0)
    errors.Add("Notifier:Recipients must list at least one address");
if (Recipients.Any(string.IsNullOrWhiteSpace))
    errors.Add("Notifier:Recipients must not contain blank entries");

// Program.cs
app.MapPost("/send-bulk", (string[] to, IOptions<NotifierOptions> opt) =>
{
    var addresses = to is { Length: > 0 } ? to : opt.Value.Recipients;
    return Results.Ok(addresses
        .Select(addr => FakeSmtp.Send(opt.Value.SmtpHost, addr, opt.Value.RetryCount))
        .ToList());
});
```

WHY: JSON arrays bind as `Notifier:Recipients:0`, `:1`, `:2` — literally indexed keys — which is why a single element can be replaced from the environment while the rest keep their file values, and also why "override an array" sometimes surprises people who expected replacement of the whole list. The blank-entry rule exists because a trailing comma or an empty string in a config file is a classic copy-paste artefact that would otherwise send mail to nobody, forever, silently. The fallback belongs in the endpoint rather than in `FakeSmtp` because "who to notify when unspecified" is policy, and policy lives in configuration.

### 4. Let the framework fail fast for you

```csharp
// Program.cs — replaces both Configure<T>(...) and the manual startup check
builder.Services
    .AddOptions<NotifierOptions>()
    .Bind(builder.Configuration.GetSection("Notifier"))
    .Validate(o => o.Validate().Count == 0,
              "Bad Notifier configuration — see NotifierOptions.Validate() for the rules")
    .ValidateOnStart();
```

WHY: the manual version worked, but it only ran because someone remembered to write it *and* put it before `app.Run()` — delete those three lines and the app boots happily with nonsense settings. `ValidateOnStart()` makes the check part of the host's startup contract, so it cannot be skipped, and `OptionsValidationException` names the options type in the message. Notice what did *not* change: the rules still live in the pure, unit-tested `Validate()` method, and the framework merely asks it a yes/no question. That is the right division — the framework owns *when* validation happens, your domain owns *what* is valid.

### 5. Settings that change without a restart

```csharp
// Program.cs
app.MapGet("/banner", (IOptionsMonitor<NotifierOptions> opt) => Results.Ok(new
{
    message = opt.CurrentValue.BetaBanner
        ? "[BETA] New notification engine enabled — expect rough edges!"
        : "Notifications are up.",
}));
```

```jsonc
// appsettings.Development.json — layered ON TOP of appsettings.json
{
  "Notifier": { "BetaBanner": true }
}
```

WHY: the three interfaces are three answers to "when may this value change?" — `IOptions<T>` is a singleton read once (fastest, and correct for settings that must not shift under a running operation), `IOptionsSnapshot<T>` is recomputed per request (scoped, so it cannot be injected into a singleton), and `IOptionsMonitor<T>` re-reads on every access and can raise change notifications. A feature flag wants the last one; `RetryCount` arguably wants the first, because a retry loop that discovers the count changed halfway through is a bug you will spend an afternoon on. The environment file is a separate layer, not a separate config: `appsettings.Development.json` only needs to state its *differences*, because later layers override earlier ones key by key — the same mechanism that lets one environment variable beat a whole file.
