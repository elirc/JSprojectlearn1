// Tests.cs — the pipeline's DECISIONS, tested without any pipeline.
// Who may pass? Which paths are protected? What does the timing header
// look like? All pure functions now — the middleware just applies them.
public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("ApiKeyChecker — who gets through the gate");
        Check.True(ApiKeyChecker.IsValid("letmein"), "the right key is accepted");
        Check.True(!ApiKeyChecker.IsValid("password123"), "a wrong key is rejected");
        Check.True(!ApiKeyChecker.IsValid("LETMEIN"), "keys are case-sensitive");
        Check.True(!ApiKeyChecker.IsValid(" letmein"), "no sloppy whitespace allowed");
        Check.True(!ApiKeyChecker.IsValid(""), "an empty header value is rejected");
        Check.True(!ApiKeyChecker.IsValid(null), "a missing header (null) is rejected");

        Console.WriteLine("PathRules.IsAdmin — which doors the gate guards");
        Check.True(PathRules.IsAdmin("/admin"), "/admin itself is protected");
        Check.True(PathRules.IsAdmin("/admin/stats"), "/admin/stats is protected");
        Check.True(PathRules.IsAdmin("/admin/users"), "/admin/users is protected — the original's forgotten endpoint, covered by construction");
        Check.True(PathRules.IsAdmin("/admin/"), "/admin/ (trailing slash) is protected");
        Check.True(PathRules.IsAdmin("/ADMIN/stats"), "matching ignores case (URLs arrive in any casing)");
        Check.True(!PathRules.IsAdmin("/status"), "/status is public");
        Check.True(!PathRules.IsAdmin("/administrator"), "/administrator is NOT under /admin — naive StartsWith would wrongly lock this");
        Check.True(!PathRules.IsAdmin("/adminlike"), "/adminlike is not under /admin either");
        Check.True(!PathRules.IsAdmin(""), "an empty path is not admin");
        Check.True(!PathRules.IsAdmin(null), "a null path is not admin");

        Console.WriteLine("TimingFormat.Header — what goes into X-Elapsed");
        Check.Equal("12.3ms", TimingFormat.Header(TimeSpan.FromMilliseconds(12.34)), "rounds to one decimal");
        Check.Equal("0.0ms", TimingFormat.Header(TimeSpan.Zero), "zero elapsed formats cleanly");
        Check.Equal("1000.0ms", TimingFormat.Header(TimeSpan.FromSeconds(1)), "a full second is still expressed in ms");
        Check.Equal("0.5ms", TimingFormat.Header(TimeSpan.FromMilliseconds(0.51)), "sub-millisecond values survive");

        return Check.Summary();
    }
}
