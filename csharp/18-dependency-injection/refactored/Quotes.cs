public record Quote(string Text, string Author);

// What clients send when adding a quote.
public record QuoteInput(string? Text, string? Author);

// The SEAM (cs#10's plug-in idea): anything that stores quotes. The service
// depends on this interface, never on a concrete class — so tests hand it a
// fresh in-memory repo and production could hand it a database tomorrow.
public interface IQuoteRepo
{
    IReadOnlyList<Quote> All();
    void Add(Quote quote);
}

public class InMemoryQuoteRepo : IQuoteRepo
{
    private readonly List<Quote> _quotes;

    // Constructible by ANYONE, seeded with whatever the caller wants —
    // compare the original's private constructor + static Instance.
    public InMemoryQuoteRepo(IEnumerable<Quote>? seed = null)
        => _quotes = seed?.ToList() ?? new List<Quote>();

    public IReadOnlyList<Quote> All() => _quotes;
    public void Add(Quote quote) => _quotes.Add(quote);
}
