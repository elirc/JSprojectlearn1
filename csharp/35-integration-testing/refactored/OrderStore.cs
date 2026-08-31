// Storage, behind a lock (cs#21). Note that `Add` is where totals are
// computed: an Order cannot exist in this store without correct totals,
// because there is no other way to make one.

public class OrderStore
{
    private readonly List<Order> _orders = new();
    private readonly object _lock = new();
    private int _nextId = 1;

    public IReadOnlyList<Order> All()
    {
        lock (_lock) return _orders.ToList();
    }

    public Order? Find(int id)
    {
        lock (_lock) return _orders.FirstOrDefault(o => o.Id == id);
    }

    public Order Add(IReadOnlyList<OrderLine> lines)
    {
        var (subtotal, tax, total) = Totals.For(lines);
        lock (_lock)
        {
            var order = new Order(_nextId++, lines, subtotal, tax, total);
            _orders.Add(order);
            return order;
        }
    }

    public bool Delete(int id)
    {
        lock (_lock) return _orders.RemoveAll(o => o.Id == id) > 0;
    }
}
