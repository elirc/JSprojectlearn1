// ============================================================================
// CS 13 — extension-linq-utils — ORIGINAL (a Utils grab-bag you read backwards)
// Run from repo root:  dotnet run csharp/13-extension-linq-utils/original.cs
// ============================================================================
// Four honest little helpers — chunk, compact, unique, countBy (js#26's cast,
// reunited) — written as a static Utils class of index loops. Each one works.
// The pain is in USING them: every pipeline reads inside-out, they only speak
// List<string>, and one of them fails silently.

var words = new List<string?>
{
    "apple", null, "banana", "apple", "cherry", null, "date", "banana", "fig"
};

Console.WriteLine("=== the Utils grab-bag ===");

// Clean the list, dedupe it, then box it into rows of three.
// To follow the data you must read this line RIGHT-TO-LEFT:
var chunks = Utils.Chunk(Utils.Unique(Utils.Compact(words)), 3);
foreach (var chunk in chunks)
    Console.WriteLine($"  [{string.Join(", ", chunk)}]");

Console.WriteLine();
Console.WriteLine("=== counting by first letter ===");
var counts = Utils.CountBy(Utils.Compact(words), w => w[..1]);
foreach (var pair in counts)
    Console.WriteLine($"  {pair.Key}: {pair.Value}");

Console.WriteLine();
Console.WriteLine("=== the silent failure ===");
var lost = Utils.Chunk(Utils.Compact(words), 0);   // size 0: surely an error?
Console.WriteLine($"Chunk(..., 0) returned {lost.Count} chunks — our 7 words just VANISHED.");
Console.WriteLine("No exception, no warning. The bug will surface somewhere else, later.");

Console.WriteLine();
Console.WriteLine("(Need these helpers for a List<int> tomorrow? This class only");
Console.WriteLine("speaks List<string> — get ready to copy-paste all four methods.)");

static class Utils
{
    // Drop nulls and empty strings.
    public static List<string> Compact(List<string?> items)
    {
        var result = new List<string>();
        for (int i = 0; i < items.Count; i++)
        {
            if (!string.IsNullOrEmpty(items[i]))
            {
                result.Add(items[i]!);
            }
        }
        return result;
    }

    // First-seen-wins de-duplication... via a nested scan. O(n^2).
    public static List<string> Unique(List<string> items)
    {
        var result = new List<string>();
        for (int i = 0; i < items.Count; i++)
        {
            bool seen = false;
            for (int j = 0; j < result.Count; j++)
            {
                if (result[j] == items[i]) { seen = true; break; }
            }
            if (!seen) result.Add(items[i]);
        }
        return result;
    }

    // Split into batches of `size`. A bad size is silently "handled" by
    // returning an empty list — the caller's data just disappears.
    public static List<List<string>> Chunk(List<string> items, int size)
    {
        var result = new List<List<string>>();
        if (size <= 0) return result;              // <- the quiet lie
        for (int i = 0; i < items.Count; i += size)
        {
            var batch = new List<string>();
            for (int j = i; j < i + size && j < items.Count; j++)
            {
                batch.Add(items[j]);
            }
            result.Add(batch);
        }
        return result;
    }

    // Count items per key.
    public static Dictionary<string, int> CountBy(List<string> items, Func<string, string> keyOf)
    {
        var result = new Dictionary<string, int>();
        for (int i = 0; i < items.Count; i++)
        {
            var key = keyOf(items[i]);
            if (result.ContainsKey(key)) { result[key] = result[key] + 1; }
            else { result[key] = 1; }
        }
        return result;
    }
}
