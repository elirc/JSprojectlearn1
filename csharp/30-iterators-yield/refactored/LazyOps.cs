// The original's three list-building stages, rewritten as iterators — which is
// to say, rewritten as LINQ. `Where`, `Select`, `TakeWhile` and `Take` are
// exactly these methods; writing them once removes the magic for good.
//
// Every one has the same skeleton: foreach over the source, decide, maybe
// `yield return`. No `new List<...>()` anywhere in the file. Extension methods
// (cs#13) let them chain: source.Filtered(...).Mapped(...).FirstFew(5).

public static class LazyOps
{
    /// LINQ's Where. Pulls one item from the source, tests it, passes it on or
    /// drops it, then FREEZES until asked again.
    public static IEnumerable<T> Filtered<T>(this IEnumerable<T> source, Func<T, bool> keep)
    {
        foreach (var item in source)
            if (keep(item))
                yield return item;
    }

    /// LINQ's Select. Note the two type parameters: in T, out TResult, so the
    /// output sequence can be a different shape from the input.
    public static IEnumerable<TResult> Mapped<T, TResult>(this IEnumerable<T> source, Func<T, TResult> convert)
    {
        foreach (var item in source)
            yield return convert(item);
    }

    /// LINQ's TakeWhile. `yield break` means "the sequence ends here" — the
    /// consumer's foreach finishes and the SOURCE is never asked again. That is
    /// the line the original could not write: its `break` stopped the copying,
    /// but the giant list had already been built.
    public static IEnumerable<T> Until<T>(this IEnumerable<T> source, Func<T, bool> keepGoing)
    {
        foreach (var item in source)
        {
            if (!keepGoing(item)) yield break;
            yield return item;
        }
    }

    /// LINQ's Take: the operator that makes infinite sequences safe. It stops
    /// pulling after `count` items, so everything upstream stops too.
    public static IEnumerable<T> FirstFew<T>(this IEnumerable<T> source, int count)
    {
        if (count <= 0) yield break;
        int taken = 0;
        foreach (var item in source)
        {
            yield return item;
            if (++taken == count) yield break;
        }
    }

    /// Fixed-size buckets, streamed: the batch that fills up is handed over
    /// immediately and forgotten. Memory holds one batch, not the whole source
    /// — the shape you want for "insert 10 million rows, 500 at a time".
    public static IEnumerable<IReadOnlyList<T>> Batched<T>(this IEnumerable<T> source, int size)
    {
        if (size < 1) throw new ArgumentOutOfRangeException(nameof(size), "batch size must be at least 1");
        return Iterate(source, size);

        static IEnumerable<IReadOnlyList<T>> Iterate(IEnumerable<T> source, int size)
        {
            var batch = new List<T>(size);
            foreach (var item in source)
            {
                batch.Add(item);
                if (batch.Count == size)
                {
                    yield return batch;
                    batch = new List<T>(size);   // a fresh one: the caller keeps the old
                }
            }
            if (batch.Count > 0) yield return batch;   // the short final batch
        }
    }
}
