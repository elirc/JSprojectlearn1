// One record that captures everything a list endpoint accepts, plus the two
// pure functions that make it trustworthy.
//
// The governing rule, and it is worth saying out loud before reading the code:
//
//     CLAMP what has an obvious intent. REJECT what doesn't.
//
// `?page=-3` obviously means "the first page" — nobody typed -3 hoping for an
// error message, so clamping to 1 is a kindness with no ambiguity. `?sort=pirce`
// has no obvious intent: we could guess "price", we could ignore it and return
// id order, and both guesses can silently hand the caller the wrong data. So
// that one gets a 400 with the allowed values listed. Guessing is only safe
// when there is exactly one thing the user could have meant.
//
// `?pageSize=100000` is the interesting middle case. The intent is obvious
// ("everything"), but honouring it re-creates the original's problem — so we
// clamp to MaxPageSize. A cap is not a limitation on the caller; it is the
// server refusing to be talked into a denial of service by a query string.

public record PageRequest(int Page, int PageSize, string Sort, string? Search)
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;
    public const string DefaultSort = "id";

    /// The whitelist. Anything not on this list is a 400, which means adding an
    /// internal property to `Product` can never accidentally make it sortable
    /// (and therefore discoverable) by a stranger with a query string.
    public static readonly IReadOnlyList<string> SortFields = ["id", "name", "price", "stock"];

    /// "price" -> (price, ascending); "-price" -> (price, descending).
    public static (string Field, bool Descending) ParseSort(string sort)
        => sort.StartsWith('-') ? (sort[1..], true) : (sort, false);

    /// The REJECT half. Returns every problem at once (cs#17's validation
    /// shape) so a client fixing their URL doesn't need three round trips.
    public static IReadOnlyList<string> Validate(string? sort)
    {
        var errors = new List<string>();

        if (!string.IsNullOrWhiteSpace(sort))
        {
            var (field, _) = ParseSort(sort.Trim().ToLowerInvariant());
            if (!SortFields.Contains(field))
                errors.Add($"unknown sort field '{field}'. Allowed: {string.Join(", ", SortFields)} " +
                           "(prefix with '-' for descending, e.g. -price)");
        }

        return errors;
    }

    /// The CLAMP half. Total function: whatever you pass in, a usable
    /// PageRequest comes out. It cannot throw, which is the point — no query
    /// string should ever be able to produce a 500.
    public static PageRequest Normalize(int? page, int? pageSize, string? sort, string? search)
    {
        var normalizedPage = page is null || page < 1 ? 1 : page.Value;

        var normalizedSize = pageSize is null
            ? DefaultPageSize
            : Math.Clamp(pageSize.Value, 1, MaxPageSize);

        var normalizedSort = string.IsNullOrWhiteSpace(sort)
            ? DefaultSort
            : sort.Trim().ToLowerInvariant();

        // Blank search means "no search", not "search for nothing". Collapsing
        // "" and "   " and null into one value here means the query code below
        // has exactly one case to handle instead of four.
        var normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();

        return new PageRequest(normalizedPage, normalizedSize, normalizedSort, normalizedSearch);
    }
}
