// ============================================================================
// CS 14 — async-await-basics — ORIGINAL (pays triple, then lies about errors)
// Run from repo root:  dotnet run csharp/14-async-await-basics/original.cs
// ============================================================================
// A user dashboard needs three pieces of data. The "API" below fakes network
// calls with Task.Delay (~300 ms each). The three calls are INDEPENDENT —
// none needs another's answer — yet this code:
//   1. runs them one after another, and
//   2. blocks on each with .Result (sync-over-async),
// so the stopwatch reads ~900 ms for ~300 ms of necessary waiting. Then it
// demonstrates the OTHER classic .Result/.Wait() surprise: wrapped errors.

using System.Diagnostics;

var api = new SlowApi();

Console.WriteLine("=== loading the dashboard, one blocked wait at a time ===");
var watch = Stopwatch.StartNew();

// .Result stops the whole thread until the task finishes. Three independent
// calls, three full waits, strictly one after another.
string profile = api.FetchProfile().Result;
string orders = api.FetchOrders().Result;
string recs = api.FetchRecommendations().Result;

watch.Stop();
Console.WriteLine($"profile:         {profile}");
Console.WriteLine($"orders:          {orders}");
Console.WriteLine($"recommendations: {recs}");
Console.WriteLine($"total: {watch.ElapsedMilliseconds} ms — three ~300 ms waits, paid in full,");
Console.WriteLine("one after another. The calls never needed each other's answers.");

Console.WriteLine();
Console.WriteLine("=== error handling, the confusing way ===");
try
{
    api.FetchBroken().Wait();     // .Wait() is .Result's void-returning twin
}
catch (Exception ex)
{
    Console.WriteLine($"caught:  {ex.GetType().Name}");
    Console.WriteLine($"message: {ex.Message}");
    if (ex is AggregateException agg)
    {
        var inner = agg.InnerExceptions[0];
        Console.WriteLine($"the REAL error was buried inside: {inner.GetType().Name}: {inner.Message}");
    }
    Console.WriteLine("We threw an InvalidOperationException — and caught an AggregateException.");
    Console.WriteLine(".Wait() and .Result WRAP failures. `await` would have handed us the real one.");
}

// (In a console app, .Result "merely" wastes a thread. In a UI app or classic
// ASP.NET it can DEADLOCK the whole program — see LEARN.md for why.)

class SlowApi
{
    // Task.Delay = "pretend we're waiting on the network".
    public async Task<string> FetchProfile()
    {
        await Task.Delay(300);
        return "Ada Lovelace";
    }

    public async Task<string> FetchOrders()
    {
        await Task.Delay(300);
        return "3 open orders";
    }

    public async Task<string> FetchRecommendations()
    {
        await Task.Delay(300);
        return "2 book recommendations";
    }

    public async Task<string> FetchBroken()
    {
        await Task.Delay(100);
        throw new InvalidOperationException("orders database is down");
    }
}
