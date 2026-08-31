// Filter, then sort, then slice — in that order, and the order matters.
//
// Slice first and you page through the unfiltered catalogue and then hide most
// of what you found: page 1 might show three products and page 2 none. Sort
// after slicing and you sort twenty arbitrary items rather than picking the top
// twenty of everything. FILTER -> SORT -> SLICE is the only sequence that means
// what a user expects "page 2 of cheap chairs" to mean.

public static class ProductQuery
{
    public static PagedResult<Product> Apply(IReadOnlyList<Product> products, PageRequest request)
        => Paginator.Slice(Sort(Filter(products, request.Search), request.Sort), request);

    /// Case-insensitive substring match over name and category. A null or blank
    /// term means "everything" — normalized to null by PageRequest, so there is
    /// exactly one "no search" value to check for.
    public static IReadOnlyList<Product> Filter(IReadOnlyList<Product> products, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return products;

        return products
            .Where(p => p.Name.Contains(search, StringComparison.OrdinalIgnoreCase)
                     || p.Category.Contains(search, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    /// The whitelist IS this switch. There is no path from a client string to a
    /// property lookup — the worst an unknown field can do is fall to the `_`
    /// case, and Validate has already rejected it with a 400 before we get here.
    public static IReadOnlyList<Product> Sort(IReadOnlyList<Product> products, string sort)
    {
        var (field, descending) = PageRequest.ParseSort(sort);

        IOrderedEnumerable<Product> ordered = (field, descending) switch
        {
            ("name", false) => products.OrderBy(p => p.Name, StringComparer.Ordinal),
            ("name", true) => products.OrderByDescending(p => p.Name, StringComparer.Ordinal),
            ("price", false) => products.OrderBy(p => p.Price),
            ("price", true) => products.OrderByDescending(p => p.Price),
            ("stock", false) => products.OrderBy(p => p.Stock),
            ("stock", true) => products.OrderByDescending(p => p.Stock),
            (_, true) => products.OrderByDescending(p => p.Id),
            _ => products.OrderBy(p => p.Id),
        };

        // The tie-break is not a nicety — it is what makes pagination CORRECT.
        // Sorting by price alone leaves products with equal prices in an
        // unspecified order, and "unspecified" is free to differ between the
        // request for page 1 and the request for page 2. A product then appears
        // on both pages while another appears on neither. Adding `ThenBy(Id)`
        // makes the order TOTAL: every item has exactly one position, so the
        // pages tile the catalogue exactly once.
        return (descending ? ordered.ThenByDescending(p => p.Id) : ordered.ThenBy(p => p.Id))
            .ToList();
    }
}
