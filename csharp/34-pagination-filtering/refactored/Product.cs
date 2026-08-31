// The domain: a product, and a catalogue holding some.
//
// `ProductCatalog` takes its products as a constructor argument rather than
// generating them internally, for the usual reason — tests want a catalogue of
// four items with prices they chose, not 10,000 items they have to reason
// about. `Seeded()` is what the app uses.

public record Product(int Id, string Name, string Category, decimal Price, int Stock);

public class ProductCatalog
{
    public IReadOnlyList<Product> Products { get; }

    public ProductCatalog(IEnumerable<Product> products) => Products = products.ToList();

    public int Count => Products.Count;

    /// The app's catalogue. Deterministic on purpose: the same 10,000 products
    /// every run, so a page boundary you find today is still there tomorrow.
    public static ProductCatalog Seeded(int count = 10_000) => new(Generate(count));

    private static IEnumerable<Product> Generate(int count)
    {
        string[] categories = ["tools", "toys", "books", "food", "garden"];
        string[] adjectives = ["Rustic", "Sleek", "Handmade", "Refined", "Ergonomic"];
        string[] nouns = ["Chair", "Lamp", "Table", "Mug", "Shelf"];

        for (int i = 1; i <= count; i++)
            yield return new Product(
                Id: i,
                Name: $"{adjectives[i % 5]} {nouns[(i / 5) % 5]} #{i:D5}",
                Category: categories[i % 5],
                Price: 1.99m + (i % 500),
                Stock: i % 97);
    }
}
