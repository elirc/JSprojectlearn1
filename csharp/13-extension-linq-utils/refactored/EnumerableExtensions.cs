// Extension methods: ordinary static methods whose first parameter is marked
// `this`. The compiler then lets you call them AS IF they were instance
// methods on that parameter — so pipelines read left-to-right:
//
//     words.Compact().Unique().Chunk(3)
//
// instead of inside-out:
//
//     Utils.Chunk(Utils.Unique(Utils.Compact(words)), 3)
//
// This is exactly how ALL of LINQ works — Where, Select, GroupBy are just
// extension methods on IEnumerable<T> living in a static class you never see.
//
// Fun fact: LINQ itself gained Chunk (.NET 6) and CountBy (.NET 9). Ours
// shadow the built-ins because extensions declared in your own code win over
// imported ones. We keep the js#26 names to mirror that project; production
// code would simply use the built-ins.
public static class EnumerableExtensions
{
    /// Drops nulls, keeps order. Built WITH LINQ — Where filters, Select
    /// re-types each survivor from T? to T (the `!` is justified: Where
    /// already ruled null out). Works for ANY reference type; the original's
    /// version only spoke List<string>.
    public static IEnumerable<T> Compact<T>(this IEnumerable<T?> source) where T : class
        => source.Where(item => item is not null).Select(item => item!);

    /// Same idea for nullable VALUE types (int?, double?, ...). A separate
    /// overload because int? is a different animal from string? — it's
    /// Nullable<int>, a real wrapper struct (project 05's LEARN.md).
    public static IEnumerable<T> Compact<T>(this IEnumerable<T?> source) where T : struct
        => source.Where(item => item.HasValue).Select(item => item!.Value);

    /// First-seen-wins de-duplication, streaming via yield return.
    /// (LINQ ships this as Distinct() — this is roughly its insides.)
    /// HashSet.Add returns false for an item it already holds, and checks
    /// in O(1) — the original's nested scan was O(n^2).
    public static IEnumerable<T> Unique<T>(this IEnumerable<T> source)
    {
        var seen = new HashSet<T>();
        foreach (var item in source)
        {
            if (seen.Add(item))
                yield return item;
        }
    }

    /// Splits a sequence into Lists of `size`; the last chunk may be shorter.
    /// A bad size THROWS — loudly, immediately — where the original silently
    /// returned nothing.
    ///
    /// Note the two-method split: an iterator body (yield return) does not
    /// run until the first foreach, so validation INSIDE it would be
    /// deferred too — the throw would fire far from the buggy call site.
    /// Validate eagerly in a normal method, then hand off to the iterator.
    public static IEnumerable<List<T>> Chunk<T>(this IEnumerable<T> source, int size)
    {
        if (size < 1)
            throw new ArgumentOutOfRangeException(nameof(size), "chunk size must be at least 1");
        return ChunkIterator(source, size);
    }

    private static IEnumerable<List<T>> ChunkIterator<T>(IEnumerable<T> source, int size)
    {
        var batch = new List<T>();
        foreach (var item in source)
        {
            batch.Add(item);
            if (batch.Count == size)
            {
                yield return batch;
                batch = new List<T>();
            }
        }
        if (batch.Count > 0)
            yield return batch;
    }

    /// Counts items per key: words.CountBy(w => w.Length).
    /// Built WITH LINQ — GroupBy does the bucketing (project 04), and
    /// ToDictionary shapes the result. The key-extractor parameter is
    /// js#26's `keyOf` trick: the CALLER decides how to measure, so one
    /// method covers any grouping of any element type.
    public static Dictionary<TKey, int> CountBy<T, TKey>(
        this IEnumerable<T> source, Func<T, TKey> keyOf) where TKey : notnull
        => source.GroupBy(keyOf).ToDictionary(group => group.Key, group => group.Count());
}
