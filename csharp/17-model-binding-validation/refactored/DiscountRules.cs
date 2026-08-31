// Pure pricing rule — no HTTP, no parsing, just the decision.
// The endpoint declares `int age`, so by the time this runs, "abc" has
// already been rejected by the framework with an automatic 400.
public static class DiscountRules
{
    public static int Percent(int age) => age switch
    {
        < 0 => 0,      // nonsense ages get no discount rather than a crash
        < 18 => 20,    // kids and teens
        >= 65 => 30,   // seniors
        _ => 0,
    };
}
