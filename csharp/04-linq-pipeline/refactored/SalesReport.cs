// Every question is one pure method, one LINQ pipeline, zero flag variables.
// LINQ is C#'s filter/map/reduce: Where=filter, Select=map, Sum/Average=reduce,
// GroupBy = the thing you hand-rolled with parallel lists in the original.
public static class SalesReport
{
    // "total per region" — GroupBy makes the buckets, ToDictionary labels them.
    public static Dictionary<string, decimal> TotalByRegion(IEnumerable<Sale> sales) =>
        sales.GroupBy(s => s.Region)
             .ToDictionary(g => g.Key, g => g.Sum(s => s.Amount));

    // "top product by revenue" — group, rank the groups, take the winner's name.
    // Throws InvalidOperationException on an empty list (there IS no top product);
    // the tests pin that down.
    public static string TopProduct(IEnumerable<Sale> sales) =>
        sales.GroupBy(s => s.Product)
             .OrderByDescending(g => g.Sum(s => s.Amount))
             .First().Key;

    // "average of the big sales" — filter, project to numbers, average.
    // Returns 0 when nothing qualifies (Average() on empty would throw).
    public static decimal AverageOver(IEnumerable<Sale> sales, decimal threshold)
    {
        var big = sales.Where(s => s.Amount > threshold)
                       .Select(s => s.Amount)
                       .ToList();
        return big.Count == 0 ? 0m : big.Average();
    }

    // Bonus chain: which products sold in a region, de-duplicated, A→Z.
    public static List<string> ProductsIn(IEnumerable<Sale> sales, string region) =>
        sales.Where(s => s.Region == region)
             .Select(s => s.Product)
             .Distinct()
             .OrderBy(p => p)
             .ToList();
}
