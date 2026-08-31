// The envelope, and the six lines of arithmetic that fill it.
//
// This is generic (`<T>`) because slicing has nothing to do with products.
// Orders, users, log lines — any already-ordered list pages the same way, and
// keeping the arithmetic in one generic place means the off-by-one gets fixed
// once for everything (cs#11's lesson).

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public static class Paginator
{
    /// `ordered` must already be filtered and sorted — this method only slices.
    /// Splitting "which items" from "which twenty of them" keeps both testable.
    public static PagedResult<T> Slice<T>(IReadOnlyList<T> ordered, PageRequest request)
    {
        var totalItems = ordered.Count;

        // Ceiling division without floating point: (a + b - 1) / b. Using
        // Math.Ceiling(25 / 10.0) would work too, but doubles in page-count
        // arithmetic is how you end up one page short at exactly one size.
        var totalPages = totalItems == 0
            ? 0
            : (totalItems + request.PageSize - 1) / request.PageSize;

        // PAGE 1 SKIPS NOTHING. This single `- 1` is the entire off-by-one
        // lesson, and the reason it lives here — once, in a tested function —
        // instead of being retyped in every endpoint that lists something.
        //
        // The cast to `long` is not decoration: `(int.MaxValue - 1) * 20`
        // overflows int and wraps NEGATIVE, and `Skip(negative)` skips nothing,
        // so `?page=2000000000` would quietly return page one. Overflow bugs
        // don't announce themselves; they hand you plausible data.
        long skip = (long)(request.Page - 1) * request.PageSize;

        var items = skip >= totalItems
            ? Array.Empty<T>()                       // past the end: empty page, not an error
            : ordered.Skip((int)skip).Take(request.PageSize).ToArray();

        // Note what's in the envelope: the client now knows how many items
        // exist and how many pages there are, so "is there a next page?" is
        // arithmetic instead of an experiment.
        return new PagedResult<T>(items, request.Page, request.PageSize, totalItems, totalPages);
    }
}
