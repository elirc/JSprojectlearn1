// Retry-with-delay — js#43's helper, in C#. Call a flaky async operation up
// to maxAttempts times, sleeping (asynchronously!) between attempts.
public static class Retry
{
    public static async Task<T> RunAsync<T>(
        Func<Task<T>> action,
        int maxAttempts,
        int delayMs = 50,
        CancellationToken ct = default)
    {
        if (maxAttempts < 1)
            throw new ArgumentOutOfRangeException(nameof(maxAttempts), "need at least one attempt");

        for (int attempt = 1; ; attempt++)
        {
            try
            {
                return await action();
            }
            // An exception FILTER: this catch only applies while attempts
            // remain — the final failure sails past it to the caller,
            // unwrapped. Cancellation is never retried: "the caller told us
            // to stop" is not a flaky server (js#43's transient/permanent
            // split, in one line).
            catch (Exception ex) when (attempt < maxAttempts && ex is not OperationCanceledException)
            {
                await Task.Delay(delayMs, ct);   // give the flaky thing room to recover
            }
        }
    }
}
