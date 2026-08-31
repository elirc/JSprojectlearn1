// Tiny test helper — real projects use xUnit (a NuGet package); this repo
// hand-rolls the same idea so everything runs offline with zero setup.
public static class Check
{
    static int passed, failed;
    public static void Equal<T>(T expected, T actual, string name)
    {
        if (Equals(expected, actual)) { passed++; Console.WriteLine($"  ok  {name}"); }
        else { failed++; Console.WriteLine($"  FAIL {name}\n       expected: {expected}\n       actual:   {actual}"); }
    }
    public static void True(bool condition, string name) => Equal(true, condition, name);
    public static void Throws<TEx>(Action act, string name) where TEx : Exception
    {
        try { act(); failed++; Console.WriteLine($"  FAIL {name} (no exception thrown)"); }
        catch (TEx) { passed++; Console.WriteLine($"  ok  {name}"); }
    }
    public static int Summary()
    {
        Console.WriteLine($"{passed} passed, {failed} failed");
        return failed == 0 ? 0 : 1;
    }
}
