public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("Compact");
        var withNulls = new List<string?> { "a", null, "b", null, "c" };
        Check.Equal("a,b,c", string.Join(",", withNulls.Compact()), "drops nulls, keeps order");
        Check.Equal("", string.Join(",", new List<string?>().Compact()), "empty in, empty out");
        var maybeInts = new List<int?> { 1, null, 3 };
        Check.Equal("1,3", string.Join(",", maybeInts.Compact()), "works for int? too (struct overload)");

        Console.WriteLine("Unique");
        var dupes = new List<string> { "a", "b", "a", "c", "b" };
        Check.Equal("a,b,c", string.Join(",", dupes.Unique()), "first-seen wins, order preserved");
        Check.Equal("", string.Join(",", new List<int>().Unique()), "empty input yields nothing");
        Check.Equal("7", string.Join(",", new List<int> { 7, 7, 7 }.Unique()), "all-duplicates collapse to one");

        Console.WriteLine("Chunk");
        var six = new List<int> { 1, 2, 3, 4, 5, 6 };
        var pairs = six.Chunk(2).ToList();
        Check.Equal(3, pairs.Count, "6 items in pairs -> 3 chunks");
        Check.Equal("1,2", string.Join(",", pairs[0]), "first chunk holds the first items");
        Check.Equal("5,6", string.Join(",", pairs[2]), "last chunk holds the last items");
        var uneven = new List<int> { 1, 2, 3, 4, 5 }.Chunk(2).ToList();
        Check.Equal("5", string.Join(",", uneven[2]), "leftovers form a short final chunk");
        Check.Equal(0, new List<int>().Chunk(3).Count(), "empty input -> no chunks");
        Check.Throws<ArgumentOutOfRangeException>(() => new List<int> { 1 }.Chunk(0),
            "size 0 throws IMMEDIATELY (the original silently returned nothing)");
        Check.Throws<ArgumentOutOfRangeException>(() => new List<int> { 1 }.Chunk(-2),
            "negative size throws too");

        Console.WriteLine("CountBy");
        var animals = new List<string> { "ant", "bee", "cat", "bear", "cow" };
        var byFirst = animals.CountBy(a => a[0]);
        Check.Equal(1, byFirst['a'], "one word starts with a");
        Check.Equal(2, byFirst['b'], "two words start with b");
        Check.Equal(2, byFirst['c'], "two words start with c");
        var byLength = animals.CountBy(a => a.Length);
        Check.Equal(4, byLength[3], "keyOf is caller-supplied: count by length instead");
        Check.Equal(0, new List<string>().CountBy(s => s.Length).Count, "empty input -> empty dictionary");

        Console.WriteLine("chaining");
        var messy = new List<string?> { "a", null, "b", "a", "c", null, "d" };
        var chained = messy.Compact().Unique().Chunk(2).ToList();
        Check.Equal(2, chained.Count, "Compact -> Unique -> Chunk composes into 2 chunks");
        Check.Equal("a,b", string.Join(",", chained[0]), "pipeline output: first chunk");
        Check.Equal("c,d", string.Join(",", chained[1]), "pipeline output: second chunk");

        Console.WriteLine("deferred execution");
        var source = new List<int> { 1, 2 };
        var query = source.Unique();          // recipe built; nothing ran yet
        source.Add(3);
        Check.Equal("1,2,3", string.Join(",", query),
            "a query is a recipe: it sees items added after it was built");

        return Check.Summary();
    }
}
