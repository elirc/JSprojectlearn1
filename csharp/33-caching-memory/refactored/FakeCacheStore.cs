// The test double. It is a real, working cache — just a dictionary — with two
// extra powers that make cache behaviour *observable* instead of inferred:
//
//   Sets / Removes / Hits / Misses — counters, so a test can assert "the
//     second call did not recompute" directly rather than by timing it.
//     Timing-based tests are how you get a suite that fails on a slow laptop.
//
//   ExpireAll() — pretend every entry aged out. Real expiry needs a real
//     clock; a fake lets the test say "now imagine five minutes passed" and
//     finish in microseconds.
//
// It deliberately copies the real store's behaviours (a wrong-typed entry is a
// miss; Remove on a missing key is silent) — a double that drifts from the
// real thing makes tests lie (cs#21's contract-suite lesson).

public class FakeCacheStore : ICacheStore
{
    private readonly Dictionary<string, object?> _entries = new();

    public int Sets { get; private set; }
    public int Removes { get; private set; }
    public int Hits { get; private set; }
    public int Misses { get; private set; }
    public int Count => _entries.Count;
    public IReadOnlyList<string> Keys => _entries.Keys.OrderBy(k => k).ToList();

    public bool TryGet<T>(string key, out T? value)
    {
        if (_entries.TryGetValue(key, out var raw) && raw is T typed)
        {
            Hits++;
            value = typed;
            return true;
        }
        Misses++;
        value = default;
        return false;
    }

    public void Set<T>(string key, T value)
    {
        Sets++;
        _entries[key] = value;
    }

    public void Remove(string key)
    {
        Removes++;
        _entries.Remove(key);
    }

    /// Test-only: simulate "every entry hit its expiry deadline".
    public void ExpireAll() => _entries.Clear();
}
