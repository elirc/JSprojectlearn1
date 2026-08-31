// The rules live here, away from any printing. Pure methods: value in, value out.
// Same "build up parts" pattern as 01-fizzbuzz/refactored/fizzbuzz.js.
public static class FizzBuzz
{
    // One number in, one string out. Never prints.
    public static string For(int n)
    {
        var parts = new List<string>();
        if (n % 3 == 0) parts.Add("Fizz");
        if (n % 5 == 0) parts.Add("Buzz");
        // Adding a new rule ("Bazz" for 7) is ONE line here — no branch rewrite.
        return parts.Count > 0 ? string.Concat(parts) : n.ToString();
    }

    // The loop moved here — but it still doesn't print. It returns the lines.
    public static List<string> Range(int start, int end)
    {
        var lines = new List<string>();
        for (int n = start; n <= end; n++)
        {
            lines.Add(For(n));
        }
        return lines;
    }
}
