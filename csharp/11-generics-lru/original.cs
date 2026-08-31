// ============================================================================
// CS 11 — generics-lru — ORIGINAL (compiles, runs... and lies to you)
// Run from repo root:  dotnet run csharp/11-generics-lru/original.cs
// ============================================================================
// A tiny LRU (least-recently-used) cache: it keeps the N most recently USED
// entries and evicts the stalest one when full. This version "works" — but it
// stores every key and value as `object`, so the compiler has no idea what is
// inside. Watch the demo: the crash at the end is one the compiler never
// warned about, because it COULDN'T.

var cache = new ObjectCache(3);

Console.WriteLine("=== an 'anything goes' cache ===");
cache.Set("user:1", "Ada Lovelace");
cache.Set("user:2", "Grace Hopper");
cache.Set("visits", 42);              // an int, in the same cache as strings
Console.WriteLine("stored 3 entries (capacity 3)");

// Reading anything back requires a CAST — we must *promise* the compiler
// what type is inside, and it just believes us:
string name = (string)cache.Get("user:1");
int visits = (int)cache.Get("visits");
Console.WriteLine($"user:1  -> {name}");
Console.WriteLine($"visits  -> {visits}");

// Recency tracking works: user:2 is now the least recently used, so adding a
// fourth entry evicts it (not user:1, which we just read).
cache.Set("user:3", "Margaret Hamilton");
Console.WriteLine($"after adding user:3, is user:2 still cached? {cache.Has("user:2")}");

// And now the trap. Months later, a teammate *remembers* visits as a string:
Console.WriteLine();
Console.WriteLine("=== the cast that ends a weekend ===");
try
{
    string visitsText = (string)cache.Get("visits");   // compiles without a peep!
    Console.WriteLine(visitsText);
}
catch (InvalidCastException ex)
{
    Console.WriteLine($"InvalidCastException: {ex.Message}");
    Console.WriteLine("The compiler never warned us. It couldn't: everything in the");
    Console.WriteLine("cache is `object`, so every cast is a promise it cannot check.");
}

Console.WriteLine();
Console.WriteLine("(Bonus disease: keys and values live in TWO parallel lists that");
Console.WriteLine("every method must keep in sync by hand — scroll down in this file.)");

// The cache itself. Note the complete absence of real types: object in,
// object out, fingers crossed at every call site.
class ObjectCache
{
    // Parallel lists: keys[i] belongs to values[i]. Every method must update
    // BOTH, in the same order, forever. Index 0 = least recently used.
    private readonly List<object> keys = new();
    private readonly List<object> values = new();
    private readonly int capacity;

    public ObjectCache(int capacity) { this.capacity = capacity; }

    public void Set(object key, object value)
    {
        int i = keys.IndexOf(key);
        if (i >= 0)
        {
            // Updating an existing key: remove from both lists, re-add at the
            // recent end. Forget ONE of these lines and the lists disagree.
            keys.RemoveAt(i);
            values.RemoveAt(i);
        }
        else if (keys.Count >= capacity)
        {
            // Evict the least recently used entry — the front of both lists.
            keys.RemoveAt(0);
            values.RemoveAt(0);
        }
        keys.Add(key);
        values.Add(value);
    }

    public object Get(object key)
    {
        int i = keys.IndexOf(key);
        if (i < 0) throw new KeyNotFoundException($"no entry for key '{key}'");
        // "Touch" the entry: move it to the most-recent end of BOTH lists.
        object k = keys[i];
        object v = values[i];
        keys.RemoveAt(i);
        values.RemoveAt(i);
        keys.Add(k);
        values.Add(v);
        return v;   // as an `object` — the caller has to cast, and hope
    }

    public bool Has(object key) => keys.IndexOf(key) >= 0;
}
