// Sources of numbers, written as ITERATORS. A method containing `yield return`
// does not return a list — the compiler rewrites it into a state machine that
// produces one item, freezes exactly where it is, and resumes there when the
// consumer asks for the next one. Nothing is stored, so "how big is it?" stops
// being a question the source has to answer.

public static class Sequences
{
    /// 1, 2, 3, ... forever. This is a legal, useful, harmless value: it costs
    /// one int of memory and produces exactly as many numbers as somebody asks
    /// for. `while (true)` is only an infinite loop if the consumer never stops.
    public static IEnumerable<int> Naturals()
    {
        int n = 1;
        while (true)
        {
            yield return n;
            n++;          // resumes HERE on the next MoveNext(), one int of state
        }
    }

    /// 1, 1, 2, 3, 5, 8, ... also endless. State that would need a field in a
    /// hand-written enumerator is just two locals in an iterator.
    public static IEnumerable<long> Fibonacci()
    {
        long a = 1, b = 1;
        while (true)
        {
            yield return a;
            (a, b) = (b, a + b);
        }
    }

    /// `count` numbers from `start`.
    ///
    /// THE TWO-METHOD SHAPE, and it is not decoration: the body of an iterator
    /// does not run when the method is CALLED, it runs on the first MoveNext().
    /// So a `throw` inside an iterator arrives late — at the foreach, in
    /// somebody else's code, far from the bad argument. Validating in a normal
    /// method that RETURNS the iterator puts the exception back where the
    /// mistake was. (LINQ's own operators are written exactly this way.)
    public static IEnumerable<int> Range(int start, int count)
    {
        if (count < 0)
            throw new ArgumentOutOfRangeException(nameof(count), "count cannot be negative");
        return Iterate(start, count);

        static IEnumerable<int> Iterate(int start, int count)
        {
            for (int i = 0; i < count; i++)
                yield return start + i;
        }
    }

    /// The same range, written the tempting way — one method, validation inside.
    /// Kept only so Tests.cs can prove the difference: this one does NOT throw
    /// when you call it with count = -1. It throws whenever somebody eventually
    /// enumerates it, which may be never, or may be in a different file.
    public static IEnumerable<int> RangeTheLateWay(int start, int count)
    {
        if (count < 0)
            throw new ArgumentOutOfRangeException(nameof(count), "count cannot be negative");
        for (int i = 0; i < count; i++)
            yield return start + i;
    }
}

/// Wraps any sequence — finite or infinite — and counts the items that really
/// flowed through it. The proof that laziness is not just a story: after
/// `Naturals().Filtered(...).FirstFew(5)`, this says 35, not 2 billion.
public sealed class Counted<T> : IEnumerable<T>
{
    private readonly IEnumerable<T> source;

    public Counted(IEnumerable<T> source) => this.source = source;

    public int Produced { get; private set; }

    public IEnumerator<T> GetEnumerator()
    {
        foreach (var item in source)
        {
            Produced++;
            yield return item;
        }
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}
