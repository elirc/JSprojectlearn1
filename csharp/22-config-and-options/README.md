# CS 22 — config-and-options

**Lesson: settings live in ONE typed, validated place (`appsettings.json` +
`IOptions<T>`) — not sprinkled through the code as duplicated literals that drift.**

## Run it

```
dotnet run csharp/22-config-and-options/original.cs
dotnet run --project csharp/22-config-and-options/refactored
dotnet run --project csharp/22-config-and-options/refactored -- test
```

With either server on http://localhost:5022:

```
curl http://localhost:5022/status
curl -X POST "http://localhost:5022/send?to=flaky@team.local"
curl -X POST "http://localhost:5022/send-bulk?to=flaky@team.local"
```

Against the **original**, that flaky address FAILS via `/send` (3 retries) but
DELIVERS via `/send-bulk` (5 retries) — while `/status` swears the retry count
is 3. Against the refactor, all three agree.

Override a setting without touching code (PowerShell, then bash):

```
$env:Notifier__RetryCount = "7"; dotnet run --project csharp/22-config-and-options/refactored
Notifier__RetryCount=7 dotnet run --project csharp/22-config-and-options/refactored
```

Set it to `-1` instead and the app refuses to start, naming the bad setting.
(`Remove-Item Env:Notifier__RetryCount` cleans up the PowerShell session.)

## What's wrong with the original?

1. **The same setting is hard-coded in multiple places** — retry count in
   `/send` (3), `/send-bulk` (5), `/status` (3). They were once all 3; one got
   "tuned" during an incident. Now the app disagrees with itself and `/status`
   reports fiction. Duplicated config always drifts, because nothing marks the
   copies as copies.
2. **Changing any value means editing code and redeploying** — a new SMTP host
   is a source change, a code review, a build.
3. **One binary can't serve two environments.** Staging and production want
   different hosts/flags; hard-coded values give every environment the same one.
4. **No validation**: if a hard-coded value is nonsense, nothing checks it —
   and when config *does* move to a file, a typo'd `-1` would sail straight in.

## What changed in the refactor

- **`appsettings.json`** holds a `Notifier` section — the Web SDK loads it
  automatically, then layers **environment variables** and **command line** on
  top (later wins). `Notifier__RetryCount=7` overrides the file; so does
  `-- --Notifier:RetryCount=7`.
- **`record NotifierOptions`** — the typed shape of that section, bound once:
  `builder.Services.Configure<NotifierOptions>(builder.Configuration.GetSection("Notifier"))`.
- **Endpoints inject `IOptions<NotifierOptions>`** and read `opt.Value.X`.
  Nobody owns a private copy, so drift is structurally impossible — `/status`
  now returns *the* options object every endpoint uses.
- **`Validate()` on the options record** rejects nonsense (blank host, retries
  < 1 or > 10), and Program.cs calls it at startup: a bad deploy dies in
  seconds with the setting named, instead of misbehaving quietly. The
  validation rules are pure and unit-tested, as is `FakeSmtp`'s retry behavior
  (which is what makes the 3-vs-5 drift *observable*).

## Key takeaway

Hard-coded config rots because duplication invites drift and redeploys tax
every change. Give settings one typed home, let configuration layers vary them
per environment, and validate them at startup like the user input they are.
"Change the retry count" should be a one-line config edit — never a code hunt.
