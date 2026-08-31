// The DECISIONS the middleware make, extracted as pure static methods.
// Middleware plumbing (HttpContext, headers, next()) is hard to unit-test;
// these one-liners are trivial to test — so the pipeline stays thin and
// the logic stays covered. Same split as always: decide here, do there.

public static class ApiKeyChecker
{
    public const string HeaderName = "X-Api-Key";

    // The one accepted key. Hard-coded for the lesson; a real app reads
    // secrets from configuration (that's cs#22) — never from source code.
    private const string Secret = "letmein";

    /// Exact, case-sensitive match; null/blank never passes.
    public static bool IsValid(string? presented) => presented == Secret;
}

public static class PathRules
{
    /// Which paths are protected: /admin itself and anything under it —
    /// but NOT /administrator (prefix matching needs the slash check!).
    public static bool IsAdmin(string? path)
    {
        if (string.IsNullOrEmpty(path)) return false;
        var p = path.ToLowerInvariant();
        return p == "/admin" || p.StartsWith("/admin/");
    }
}

public static class TimingFormat
{
    /// "12.3ms" — one decimal, invariant culture so a German locale
    /// doesn't turn it into "12,3ms" and confuse every client parser.
    public static string Header(TimeSpan elapsed) =>
        elapsed.TotalMilliseconds.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture) + "ms";
}
