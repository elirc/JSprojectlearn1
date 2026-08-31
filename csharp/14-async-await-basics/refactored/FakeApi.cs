// Simulated network calls, async end to end. Each one honors a
// CancellationToken: pass a cancelled (or later-cancelled) token and the
// inner Task.Delay throws OperationCanceledException instead of finishing —
// the standard .NET way for a caller to say "stop, I no longer care".
// `ct = default` means callers who don't need cancellation can omit it.
public class FakeApi
{
    private readonly int latencyMs;

    public FakeApi(int latencyMs = 250) => this.latencyMs = latencyMs;

    public async Task<string> FetchProfileAsync(CancellationToken ct = default)
    {
        await Task.Delay(latencyMs, ct);          // "the network takes a while"
        return "Ada Lovelace";
    }

    public async Task<string> FetchOrdersAsync(CancellationToken ct = default)
    {
        await Task.Delay(latencyMs, ct);
        return "3 open orders";
    }

    public async Task<string> FetchRecommendationsAsync(CancellationToken ct = default)
    {
        await Task.Delay(latencyMs, ct);
        return "2 book recommendations";
    }

    public async Task<string> FetchBrokenAsync(CancellationToken ct = default)
    {
        await Task.Delay(latencyMs / 2, ct);
        throw new InvalidOperationException("orders database is down");
    }
}
