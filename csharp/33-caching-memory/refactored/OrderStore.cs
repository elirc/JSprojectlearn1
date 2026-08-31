// The "slow database". Reads pay an artificial delay so you can *feel* what a
// cache buys you; writes are instant.
//
// The delay is a constructor parameter, not a hard-coded Thread.Sleep, for one
// reason: tests pass TimeSpan.Zero. Code that hard-codes its own slowness can
// only be tested slowly, so in practice it never gets tested at all.

public class OrderStore
{
    private readonly List<Order> _orders;
    private readonly TimeSpan _queryDelay;
    private readonly object _lock = new();
    private int _queries;

    /// The app's configuration: 2,400 orders behind an 800ms "query".
    public OrderStore() : this(TimeSpan.FromMilliseconds(800), Seed()) { }

    public OrderStore(TimeSpan queryDelay, IEnumerable<Order> seed)
    {
        _queryDelay = queryDelay;
        _orders = seed.ToList();
    }

    /// How many times the expensive read actually ran. Every cache hit is a
    /// number that did NOT go up here — that is the whole business case.
    public int Queries => Volatile.Read(ref _queries);

    public IReadOnlyList<Order> All()
    {
        if (_queryDelay > TimeSpan.Zero) Thread.Sleep(_queryDelay);   // stands in for network + disk
        Interlocked.Increment(ref _queries);
        lock (_lock) return _orders.ToList();     // a copy: callers can't mutate our list (cs#09)
    }

    public Order Add(string category, decimal amount, string month)
    {
        lock (_lock)
        {
            var order = new Order(_orders.Count + 1, category, amount, month);
            _orders.Add(order);
            return order;
        }
    }

    public int Count { get { lock (_lock) return _orders.Count; } }

    private static List<Order> Seed()
    {
        var categories = new[] { "books", "food", "toys", "tools" };
        var orders = new List<Order>(2400);
        for (int i = 1; i <= 2400; i++)
            orders.Add(new Order(i, categories[i % 4], 5m + (i % 40), $"2026-{(i % 12) + 1:00}"));
        return orders;
    }
}
