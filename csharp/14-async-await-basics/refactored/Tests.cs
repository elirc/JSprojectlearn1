public static class Tests
{
    public static int Run()
    {
        // Sync-over-async is exactly what this project warns against — with
        // ONE exception: the very top of a program. Run() is called from the
        // program's entry point; there is nothing above it left to unblock,
        // so blocking here cannot deadlock anything. We use GetAwaiter()
        // .GetResult() (not .Result) so a failure surfaces as the REAL
        // exception, not an AggregateException. This is the only place in
        // the project allowed to block — everything below is await all the
        // way down.
        RunAsync().GetAwaiter().GetResult();
        return Check.Summary();
    }

    static async Task RunAsync()
    {
        Console.WriteLine("Task.WhenAll");
        var api = new FakeApi(latencyMs: 150);
        var watch = System.Diagnostics.Stopwatch.StartNew();
        string[] results = await Task.WhenAll(
            api.FetchProfileAsync(),
            api.FetchOrdersAsync(),
            api.FetchRecommendationsAsync());
        watch.Stop();
        Check.Equal(3, results.Length, "WhenAll returns one result per task");
        Check.Equal("Ada Lovelace", results[0], "results arrive in ARGUMENT order...");
        Check.Equal("3 open orders", results[1], "...not finish order: slot 2 is task 2");
        Check.Equal("2 book recommendations", results[2], "and slot 3 is task 3");
        Check.True(watch.ElapsedMilliseconds < 400,
            $"three 150 ms waits overlapped (took {watch.ElapsedMilliseconds} ms; sequential would be ~450)");

        Console.WriteLine("errors with await");
        string caughtType = "nothing thrown";
        try { await api.FetchBrokenAsync(); }
        catch (Exception ex) { caughtType = ex.GetType().Name; }
        Check.Equal("InvalidOperationException", caughtType,
            "await surfaces the REAL exception (no AggregateException wrapper)");

        Console.WriteLine("retry");
        int calls = 0;
        string result = await Retry.RunAsync(() =>
        {
            calls++;
            if (calls < 3) throw new InvalidOperationException("flaky");
            return Task.FromResult("ok");
        }, maxAttempts: 5, delayMs: 1);
        Check.Equal("ok", result, "retry returns the eventual success");
        Check.Equal(3, calls, "two failures + one success = exactly 3 calls");

        int hopeless = 0;
        Check.Throws<InvalidOperationException>(() =>
            Retry.RunAsync<string>(() =>
            {
                hopeless++;
                throw new InvalidOperationException("always down");
            }, maxAttempts: 3, delayMs: 1).GetAwaiter().GetResult(),
            "when every attempt fails, the LAST failure escapes, unwrapped");
        Check.Equal(3, hopeless, "it tried exactly maxAttempts times, then gave up");

        Check.Throws<ArgumentOutOfRangeException>(() =>
            Retry.RunAsync(() => Task.FromResult(1), maxAttempts: 0).GetAwaiter().GetResult(),
            "maxAttempts below 1 is rejected");

        Console.WriteLine("cancellation");
        using var alreadyCancelled = new CancellationTokenSource();
        alreadyCancelled.Cancel();
        Check.Throws<OperationCanceledException>(() =>
            api.FetchProfileAsync(alreadyCancelled.Token).GetAwaiter().GetResult(),
            "a cancelled token makes the work throw OperationCanceledException");

        using var midFlight = new CancellationTokenSource();
        Task<string> inFlight = api.FetchProfileAsync(midFlight.Token);   // needs 150 ms
        midFlight.CancelAfter(20);                                        // cancel while running
        bool wasCancelled = false;
        try { await inFlight; }
        catch (OperationCanceledException) { wasCancelled = true; }
        Check.True(wasCancelled, "cancelling MID-FLIGHT aborts the wait early");

        int neverRetried = 0;
        using var stop = new CancellationTokenSource();
        stop.Cancel();
        try
        {
            await Retry.RunAsync<string>(async () =>
            {
                neverRetried++;
                await Task.Delay(50, stop.Token);
                return "unreachable";
            }, maxAttempts: 5, delayMs: 1);
        }
        catch (OperationCanceledException) { }
        Check.Equal(1, neverRetried, "retry does NOT retry a cancellation — stop means stop");
    }
}
