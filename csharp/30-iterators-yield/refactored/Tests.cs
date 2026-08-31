// Tests.cs — three groups. What the operators PRODUCE (ordinary assertions),
// what they DON'T produce (counter assertions — the laziness proof), and when
// they THROW (the deferred-exception trap).
public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("Sequences.Range");
        Check.Equal("1,2,3,4,5", string.Join(",", Sequences.Range(1, 5)), "five numbers from one");
        Check.Equal("", string.Join(",", Sequences.Range(1, 0)), "count 0 is an empty sequence, not an error");
        Check.Equal("10,11", string.Join(",", Sequences.Range(10, 2)), "start is honoured");

        Console.WriteLine("the operators, composed");
        var pipeline = Sequences.Range(1, 100)
            .Filtered(n => n % 7 == 0)
            .Until(n => n < 30)
            .Mapped(n => n * 2);
        Check.Equal("14,28,42,56", string.Join(",", pipeline), "filter -> take-while -> map, in one pull");
        Check.Equal("2,4,6", string.Join(",", Sequences.Range(1, 6).Filtered(n => n % 2 == 0)), "Filtered keeps what the predicate likes");
        Check.Equal("1,4,9", string.Join(",", Sequences.Range(1, 3).Mapped(n => n * n)), "Mapped changes the shape");
        Check.Equal("a1,a2", string.Join(",", Sequences.Range(1, 2).Mapped(n => "a" + n)), "...including to a different type entirely");

        Console.WriteLine("Until stops, it does not filter");
        int[] bumpy = [1, 2, 3, 99, 4, 5];
        Check.Equal("1,2,3", string.Join(",", bumpy.Until(n => n < 10)),
            "Until ENDS at the first failure — 4 and 5 never arrive, unlike Filtered");
        Check.Equal("1,2,3,4,5", string.Join(",", bumpy.Filtered(n => n < 10)), "...which is exactly what Filtered would have returned");
        Check.Equal("", string.Join(",", bumpy.Until(n => n > 100)), "a first item that fails ends it immediately");

        Console.WriteLine("FirstFew");
        Check.Equal("1,2,3", string.Join(",", Sequences.Range(1, 100).FirstFew(3)), "takes the first n");
        Check.Equal("1,2", string.Join(",", Sequences.Range(1, 2).FirstFew(50)), "asking for more than exists is fine");
        Check.Equal("", string.Join(",", Sequences.Range(1, 5).FirstFew(0)), "taking zero yields nothing");

        Console.WriteLine("nothing runs until you pull (the laziness proof)");
        var counted = new Counted<int>(Sequences.Range(1, 1_000_000));
        var query = counted.Filtered(n => n % 7 == 0).Mapped(n => n * 2).FirstFew(5);
        Check.Equal(0, counted.Produced, "building the query produced not one number");
        var results = query.ToList();
        Check.Equal("14,28,42,56,70", string.Join(",", results), "the answers are right");
        Check.Equal(35, counted.Produced,
            "and cost 35 numbers out of a million — the source stopped when the consumer did");
        _ = query.ToList();
        Check.Equal(70, counted.Produced, "re-enumerating re-runs it: 35 more (cs#29's lesson, from the other side)");

        Console.WriteLine("infinite sequences, made safe by laziness");
        var endless = new Counted<int>(Sequences.Naturals());
        Check.Equal("1,2,3,4,5", string.Join(",", endless.FirstFew(5)), "Take(5) of an endless sequence is five items");
        Check.Equal(5, endless.Produced, "and exactly five items of work");
        Check.Equal("21,42,63", string.Join(",", Sequences.Naturals().Filtered(n => n % 21 == 0).FirstFew(3)),
            "an endless source can be filtered and still terminate");
        Check.Equal("1,1,2,3,5,8,13", string.Join(",", Sequences.Fibonacci().FirstFew(7)), "Fibonacci keeps its state between pulls");
        Check.Equal(12586269025L, Sequences.Fibonacci().FirstFew(50).Last(), "the 50th Fibonacci number, from a sequence with no end");

        Console.WriteLine("Batched streams instead of buffering");
        var batches = Sequences.Range(1, 7).Batched(3).ToList();
        Check.Equal(3, batches.Count, "7 items in batches of 3 = 3 batches");
        Check.Equal("1,2,3", string.Join(",", batches[0]), "first batch is full");
        Check.Equal("7", string.Join(",", batches[2]), "the last batch is the short one");
        var lazyBatch = new Counted<int>(Sequences.Naturals());
        Check.Equal("1,2,3", string.Join(",", lazyBatch.Batched(3).First()),
            "the first batch of an infinite sequence arrives without waiting for the end");
        Check.Equal(3, lazyBatch.Produced, "having pulled exactly one batch's worth");

        Console.WriteLine("when the exception arrives");
        Check.Throws<ArgumentOutOfRangeException>(() => Sequences.Range(1, -1),
            "Range validates at the CALL — the two-method shape earns its keep");
        bool threwAtTheCall = false;
        IEnumerable<int> late;
        try { late = Sequences.RangeTheLateWay(1, -1); }
        catch (ArgumentOutOfRangeException) { threwAtTheCall = true; late = []; }
        Check.Equal(false, threwAtTheCall, "the one-method version returns happily with a bad argument...");
        Check.Throws<ArgumentOutOfRangeException>(() => { foreach (int _ in late) { } },
            "...and only explodes when somebody enumerates it, far from the mistake");
        Check.Throws<ArgumentOutOfRangeException>(() => Sequences.Range(1, 5).Batched(0).ToList(),
            "Batched validates its size too");

        return Check.Summary();
    }
}
