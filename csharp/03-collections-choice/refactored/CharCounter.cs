// Pure functions over strings. The right collection makes the "does it exist
// yet?" question disappear: Dictionary and HashSet answer it in one step.
public static class CharCounter
{
    // Counts every character except spaces. Case-sensitive unless asked otherwise.
    // A Dictionary<char,int> IS the letters[]+counts[] pair from original.cs —
    // as one real table, with instant lookup.
    public static Dictionary<char, int> Count(string text, bool ignoreCase = false)
    {
        var counts = new Dictionary<char, int>();
        foreach (char raw in text)          // foreach: no index bookkeeping at all
        {
            if (raw == ' ') continue;
            char c = ignoreCase ? char.ToLowerInvariant(raw) : raw;

            // The TryGetValue pattern: one lookup answers "is it there?"
            // AND hands back the value if so.
            if (counts.TryGetValue(c, out int soFar))
                counts[c] = soFar + 1;
            else
                counts[c] = 1;
        }
        return counts;
    }

    // The "flag variable scan" from original.cs, as a pure function.
    public static char MostCommon(string text)
    {
        var counts = Count(text);
        if (counts.Count == 0)
            throw new ArgumentException("no countable characters", nameof(text));

        char best = '\0';
        int bestCount = -1;
        foreach (var (c, n) in counts)      // deconstruct each key/value pair
        {
            if (n > bestCount) { best = c; bestCount = n; }
        }
        return best;
    }

    // Every distinct character, in first-seen order. HashSet is the tool for
    // "have I seen this before?" — Add returns false for repeats.
    public static List<char> UniqueInOrder(string text)
    {
        var seen = new HashSet<char>();
        var result = new List<char>();      // List grows itself — no `used` counter
        foreach (char c in text)
        {
            if (c == ' ') continue;
            if (seen.Add(c)) result.Add(c);
        }
        return result;
    }
}
