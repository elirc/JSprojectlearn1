// Money, in two rules that fit on a postcard:
//
//   1. NEVER `double`. Doubles are binary fractions, so 19.99 is stored as
//      19.989999999999998436805981327 — close enough to display, not close
//      enough to add up a thousand times. `decimal` stores base-10 fractions
//      exactly, which is why .NET has it and why every currency amount in this
//      project is one. (The other correct answer is an integer count of cents.)
//
//   2. Round AWAY FROM ZERO at midpoints. `Math.Round(2.665m, 2)` gives 2.66,
//      because .NET defaults to BANKER'S ROUNDING — ties go to the nearest
//      even digit, which is unbiased over many samples and is *not* what a
//      receipt does. Invoices round .5 up. Always.
//
// Both defaults are traps precisely because they are invisible: the code looks
// right, the numbers look right, and the error is in the last cent of the
// thousandth invoice.

public static class Money
{
    /// Round to whole cents the way an invoice does.
    public static decimal Round(decimal amount) => Math.Round(amount, 2, MidpointRounding.AwayFromZero);
}
