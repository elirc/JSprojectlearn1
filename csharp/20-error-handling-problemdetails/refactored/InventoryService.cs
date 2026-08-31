// The domain layer: all inventory DECISIONS live here, with zero knowledge of
// HTTP. Expected failures are thrown as specific domain exceptions; the
// middleware in Program.cs translates them. That's why every method here is
// testable without starting a server (see Tests.cs).

public record Item(int Id, string Name, string Category, int Stock);

public class InventoryService
{
    public static readonly string[] KnownCategories = { "electronics", "paper", "furniture" };

    private readonly List<Item> _items;
    private readonly object _lock = new();

    public InventoryService() : this(DefaultItems()) { }

    // Tests inject their own seed data through this constructor.
    public InventoryService(IEnumerable<Item> seed) => _items = seed.ToList();

    private static List<Item> DefaultItems() => new()
    {
        new(1, "Keyboard", "electronics", 12),
        new(2, "Notebook", "paper",       40),
        new(3, "Webcam",   "electronics",  1),
    };

    public IReadOnlyList<Item> GetAll()
    {
        lock (_lock) return _items.ToList();
    }

    public Item Get(int id)
    {
        lock (_lock)
            return _items.FirstOrDefault(i => i.Id == id)
                ?? throw new ItemNotFoundException(id);
    }

    public IReadOnlyList<Item> ByCategory(string category)
    {
        if (!KnownCategories.Contains(category))
            throw new UnknownCategoryException(category);   // a typo is an ERROR, not an empty list
        lock (_lock)
            return _items.Where(i => i.Category == category).ToList();
    }

    public Item Purchase(int id)
    {
        lock (_lock)
        {
            var item = _items.FirstOrDefault(i => i.Id == id)
                ?? throw new ItemNotFoundException(id);
            if (item.Stock <= 0)
                throw new OutOfStockException(item.Name);
            var updated = item with { Stock = item.Stock - 1 };
            _items[_items.IndexOf(item)] = updated;
            return updated;
        }
    }

    public Item Add(string? name, string? category, int stock)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("name is required");
        if (stock < 0)
            throw new ArgumentException("stock cannot be negative");
        if (category is null || !KnownCategories.Contains(category))
            throw new UnknownCategoryException(category ?? "(none)");
        lock (_lock)
        {
            var id = _items.Count == 0 ? 1 : _items.Max(i => i.Id) + 1;
            var item = new Item(id, name.Trim(), category, stock);
            _items.Add(item);
            return item;
        }
    }
}
