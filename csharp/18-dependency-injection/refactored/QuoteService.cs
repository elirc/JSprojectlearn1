// QuoteService — the rules, with every dependency handed in through the
// constructor ("constructor injection"). It never news-up or reaches for a
// static: storage, time, and notifications all arrive as interfaces, so
// tests can swap in fakes for any of them.
public class QuoteService
{
    private readonly IQuoteRepo _repo;
    private readonly IClock _clock;
    private readonly INotifier _notifier;

    public QuoteService(IQuoteRepo repo, IClock clock, INotifier notifier)
    {
        _repo = repo;
        _clock = clock;
        _notifier = notifier;
    }

    public IReadOnlyList<Quote> All() => _repo.All();

    /// Same date → same quote all day; the date comes from the injected
    /// clock, which is the only reason this rule is testable.
    public Quote? Daily()
    {
        var all = _repo.All();
        if (all.Count == 0) return null;
        return all[_clock.Now.DayOfYear % all.Count];
    }

    /// Returns the stored quote, or null when the text is missing/blank.
    /// A blank author becomes "anonymous". Success sends one notification.
    public Quote? Add(string? text, string? author)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var quote = new Quote(
            text.Trim(),
            string.IsNullOrWhiteSpace(author) ? "anonymous" : author.Trim());
        _repo.Add(quote);
        _notifier.Notify($"new quote by {quote.Author}: \"{quote.Text}\"");
        return quote;
    }
}
