using System.Diagnostics;

if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var api = new FakeApi(latencyMs: 300);

Console.WriteLine("=== sequential await (fine when calls DEPEND on each other) ===");
var watch = Stopwatch.StartNew();
string profile = await api.FetchProfileAsync();
string orders = await api.FetchOrdersAsync();
string recs = await api.FetchRecommendationsAsync();
watch.Stop();
Console.WriteLine($"  {profile} | {orders} | {recs}");
Console.WriteLine($"  took {watch.ElapsedMilliseconds} ms — three 300 ms waits, one after another");

Console.WriteLine();
Console.WriteLine("=== Task.WhenAll (these calls are independent!) ===");
watch.Restart();
Task<string> profileTask = api.FetchProfileAsync();   // all three START now —
Task<string> ordersTask = api.FetchOrdersAsync();     // no await yet, so nothing
Task<string> recsTask = api.FetchRecommendationsAsync(); // waits for anything
string[] results = await Task.WhenAll(profileTask, ordersTask, recsTask);
watch.Stop();
Console.WriteLine($"  {string.Join(" | ", results)}");
Console.WriteLine($"  took {watch.ElapsedMilliseconds} ms — the three 300 ms waits OVERLAPPED");

Console.WriteLine();
Console.WriteLine("=== errors with await: the real exception, not a wrapper ===");
try
{
    await api.FetchBrokenAsync();
}
catch (InvalidOperationException ex)   // the actual type — no AggregateException
{
    Console.WriteLine($"  caught {ex.GetType().Name}: {ex.Message}");
}

Console.WriteLine();
Console.WriteLine("=== retry with delay (js#43's helper, in C#) ===");
int attempts = 0;
string answer = await Retry.RunAsync(async () =>
{
    attempts++;
    await Task.Delay(30);              // pretend to call the flaky service
    if (attempts < 3) throw new InvalidOperationException($"flaky failure #{attempts}");
    return "finally worked";
}, maxAttempts: 5, delayMs: 50);
Console.WriteLine($"  \"{answer}\" on attempt {attempts}");

Console.WriteLine();
Console.WriteLine("=== cancellation: telling in-flight work to stop ===");
using var cts = new CancellationTokenSource();
cts.CancelAfter(100);                  // pull the plug after 100 ms
watch.Restart();
try
{
    await api.FetchProfileAsync(cts.Token);   // needs 300 ms — won't make it
}
catch (OperationCanceledException)
{
    watch.Stop();
    Console.WriteLine($"  cancelled after ~{watch.ElapsedMilliseconds} ms — we did NOT wait out the full 300");
}
