// The domain: quotes and the rules about them. Note what is NOT here:
// no HTML, no escaping, no HTTP. Quote text is DATA and may legally
// contain "<blink>" or "&" — turning data into safe markup is the
// frontend's job (app.js uses textContent, which can't inject).

public record Quote(string Text, string Author);

public class QuoteService
{
    private readonly List<Quote> _quotes;
    private readonly object _lock = new();

    public QuoteService() : this(DefaultQuotes()) { }

    // Tests inject their own seed here.
    public QuoteService(IEnumerable<Quote> seed) => _quotes = seed.ToList();

    private static List<Quote> DefaultQuotes() => new()
    {
        new("Simplicity is prerequisite for reliability.", "Edsger Dijkstra"),
        new("Deleted code is debugged code.", "Jeff Sickel"),
        new("Use the <blink> tag & never look back", "A 1996 webmaster"),
    };

    public IReadOnlyList<Quote> GetAll()
    {
        lock (_lock) return _quotes.ToList();
    }

    public int Count
    {
        get { lock (_lock) return _quotes.Count; }
    }

    // The "random quote" DECISION, minus the randomness: any roll maps to a
    // valid quote (wraps around, negatives too). The endpoint supplies the
    // dice; this stays deterministic and testable.
    public Quote Pick(int roll)
    {
        lock (_lock)
        {
            if (_quotes.Count == 0) throw new InvalidOperationException("no quotes yet");
            var index = ((roll % _quotes.Count) + _quotes.Count) % _quotes.Count;
            return _quotes[index];
        }
    }

    public Quote Add(string? text, string? author)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("text is required");
        var quote = new Quote(
            text.Trim(),
            string.IsNullOrWhiteSpace(author) ? "Anonymous" : author.Trim());
        lock (_lock) _quotes.Add(quote);
        return quote;
    }
}
