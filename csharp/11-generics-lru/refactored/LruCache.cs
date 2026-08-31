using System.Diagnostics.CodeAnalysis;

// An LRU (least-recently-used) cache: keeps at most Capacity entries and,
// when full, evicts the entry that has gone unused the longest.
//
// It is GENERIC: TKey and TValue are type parameters, filled in by each
// caller. A LruCache<string, int> can never hand you anything but an int —
// the original's InvalidCastException is not just fixed, it is impossible
// to write.
//
// `where TKey : notnull` is a constraint: Dictionary keys may not be null,
// so we promise the compiler our keys never are either.
public class LruCache<TKey, TValue> where TKey : notnull
{
    // ONE dictionary owns the data; ONE linked list remembers the order.
    // Front of the list = least recently used, back = most recently used.
    private readonly Dictionary<TKey, TValue> map = new();
    private readonly LinkedList<TKey> recency = new();

    public LruCache(int capacity)
    {
        if (capacity < 1)
            throw new ArgumentOutOfRangeException(nameof(capacity), "capacity must be at least 1");
        Capacity = capacity;
    }

    public int Capacity { get; }
    public int Count => map.Count;

    /// Keys from least- to most-recently used. Handy for tests and debugging.
    public IEnumerable<TKey> KeysByAge => recency;

    /// The TryGet pattern (same shape as Dictionary.TryGetValue, project 03):
    /// returns false instead of throwing for a missing key. The attribute
    /// tells the compiler "when I return false, don't trust `value`" —
    /// nullable annotations were covered in project 05's LEARN.md.
    public bool TryGet(TKey key, [MaybeNullWhen(false)] out TValue value)
    {
        if (map.TryGetValue(key, out value))
        {
            Touch(key);         // reading an entry counts as "using" it
            return true;
        }
        return false;
    }

    /// Throwing flavour, for when a miss is a bug rather than a possibility.
    public TValue Get(TKey key)
        => TryGet(key, out var value)
            ? value
            : throw new KeyNotFoundException($"cache has no entry for key '{key}'");

    public void Set(TKey key, TValue value)
    {
        if (map.ContainsKey(key))
        {
            map[key] = value;
            Touch(key);         // updating counts as "using" too
            return;
        }
        if (map.Count >= Capacity)
        {
            TKey oldest = recency.First!.Value;   // front = least recently used
            recency.RemoveFirst();
            map.Remove(oldest);
        }
        map[key] = value;
        recency.AddLast(key);
    }

    /// Peeking deliberately does NOT refresh recency — asking "is it there?"
    /// shouldn't change an entry's fate. Same design call as js#41, and it
    /// is pinned down by a test so nobody "fixes" it by accident.
    public bool Has(TKey key) => map.ContainsKey(key);

    // Move a key to the most-recent end of the list.
    // Honest note: LinkedList<T>.Remove(value) walks the list — O(n). Fine
    // for the small caches in this project; a production cache also keeps a
    // Dictionary<TKey, LinkedListNode<TKey>> so this becomes O(1). Upgrading
    // it is one of the experiments in LEARN.md.
    private void Touch(TKey key)
    {
        recency.Remove(key);
        recency.AddLast(key);
    }
}
