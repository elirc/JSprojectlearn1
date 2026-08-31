public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("Count — basics");
        var hello = CharCounter.Count("hello");
        Check.Equal(4, hello.Count, "\"hello\" has 4 distinct characters");
        Check.Equal(2, hello['l'], "l appears twice");
        Check.Equal(1, hello['h'], "h appears once");
        Check.True(!hello.ContainsKey('z'), "unseen characters simply aren't in the table");

        Console.WriteLine("Count — edge cases");
        Check.Equal(0, CharCounter.Count("").Count, "empty string gives an empty table");
        Check.Equal(0, CharCounter.Count("   ").Count, "spaces-only gives an empty table");
        var spaced = CharCounter.Count("a b a");
        Check.Equal(2, spaced.Count, "spaces are skipped: only 'a' and 'b' remain");
        Check.Equal(2, spaced['a'], "'a' counted across the spaces");
        Check.Equal(3, CharCounter.Count("!!.,!")['!'], "punctuation counts like any character");

        Console.WriteLine("Count — case handling");
        var strict = CharCounter.Count("Aa");
        Check.Equal(1, strict['A'], "case-sensitive: 'A' is its own entry");
        Check.Equal(1, strict['a'], "case-sensitive: 'a' is separate");
        var merged = CharCounter.Count("Aa", ignoreCase: true);
        Check.Equal(2, merged['a'], "ignoreCase merges 'A' into 'a'");
        Check.True(!merged.ContainsKey('A'), "ignoreCase leaves no uppercase keys");

        Console.WriteLine("MostCommon");
        Check.Equal('l', CharCounter.MostCommon("hello world"), "'l' wins with 3 in \"hello world\"");
        Check.Equal('z', CharCounter.MostCommon("z"), "single character is trivially most common");
        Check.Throws<ArgumentException>(() => CharCounter.MostCommon(""), "empty string throws — no sensible answer");
        Check.Throws<ArgumentException>(() => CharCounter.MostCommon("   "), "spaces-only throws too");

        Console.WriteLine("UniqueInOrder");
        var unique = CharCounter.UniqueInOrder("hello");
        Check.Equal(4, unique.Count, "\"hello\" has 4 unique characters");
        Check.Equal('h', unique[0], "first-seen order: h first");
        Check.Equal('l', unique[2], "l appears once, at its first position");
        Check.Equal('o', unique[3], "o last");
        Check.Equal(0, CharCounter.UniqueInOrder(" ").Count, "spaces don't count as characters");
        Check.Equal(2, CharCounter.UniqueInOrder("abab").Count, "repeats collapse to first sighting");

        return Check.Summary();
    }
}
