public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("basics");
        var c = new LruCache<string, int>(2);
        c.Set("a", 1);
        Check.True(c.TryGet("a", out var a) && a == 1, "stores and retrieves a value");
        Check.Equal(false, c.TryGet("missing", out _), "TryGet returns false for a missing key");
        Check.Throws<KeyNotFoundException>(() => c.Get("missing"), "Get throws for a missing key");
        Check.Throws<ArgumentOutOfRangeException>(() => new LruCache<string, int>(0),
            "capacity below 1 is rejected at construction");

        Console.WriteLine("eviction order");
        var lru = new LruCache<string, string>(3);
        lru.Set("a", "A"); lru.Set("b", "B"); lru.Set("c", "C");
        lru.Set("d", "D");                                     // one over capacity
        Check.Equal(3, lru.Count, "adding a 4th entry keeps Count at capacity 3");
        Check.Equal(false, lru.Has("a"), "the least recently used entry (a) was evicted");
        Check.True(lru.Has("b") && lru.Has("c") && lru.Has("d"), "the newer entries all survive");

        Console.WriteLine("reading refreshes recency");
        var hot = new LruCache<string, string>(3);
        hot.Set("a", "A"); hot.Set("b", "B"); hot.Set("c", "C");
        hot.TryGet("a", out _);                                // touch a — now b is oldest
        hot.Set("d", "D");
        Check.True(hot.Has("a"), "a recently READ entry survives eviction");
        Check.Equal(false, hot.Has("b"), "the least recently USED entry (b) goes instead");

        Console.WriteLine("updating refreshes recency");
        var upd = new LruCache<string, string>(3);
        upd.Set("a", "A"); upd.Set("b", "B"); upd.Set("c", "C");
        upd.Set("a", "A2");                                    // update, not insert
        Check.Equal(3, upd.Count, "updating an existing key does not grow the cache");
        upd.Set("d", "D");
        Check.True(upd.Has("a"), "an updated entry counts as recently used");
        Check.Equal(false, upd.Has("b"), "so b, not a, is evicted");
        Check.Equal("A2", upd.Get("a"), "and the update kept the new value");

        Console.WriteLine("Has() peeks without refreshing");
        var peek = new LruCache<string, string>(2);
        peek.Set("a", "A"); peek.Set("b", "B");
        peek.Has("a");                                         // peeking is not using
        peek.Set("c", "C");
        Check.Equal(false, peek.Has("a"), "Has() does not refresh recency — peeking is not using");

        Console.WriteLine("recency bookkeeping");
        var order = new LruCache<string, int>(3);
        order.Set("x", 1); order.Set("y", 2); order.Set("z", 3);
        order.TryGet("x", out _);
        Check.Equal("y,z,x", string.Join(",", order.KeysByAge), "KeysByAge lists least -> most recent");

        Console.WriteLine("the type-safety story");
        var typed = new LruCache<int, string>(2);              // int keys this time
        typed.Set(1, "one");
        Check.Equal("one", typed.Get(1), "one class, many shapes: LruCache<int, string> works too");
        // The strongest test of all is one we CANNOT write: there is no way
        // to put a string into a LruCache<string, int> and cast it out wrong.
        // The compiler rejects the program before it ever runs.

        return Check.Summary();
    }
}
