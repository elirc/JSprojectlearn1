// Pure functions over immutable items: carts go in, NEW carts come out.
// Nothing in this file mutates anything — which is why the tests are one-liners.
public static class CartMath
{
    public static decimal Total(IEnumerable<CartItem> items) =>
        items.Sum(item => item.LineTotal);

    // Returns a NEW list of NEW items. The cart you pass in is untouched —
    // that's the whole fix for the original's corrupted-preview bug.
    public static List<CartItem> ApplyDiscount(IEnumerable<CartItem> items, decimal percent)
    {
        if (percent < 0 || percent > 100)
            throw new ArgumentOutOfRangeException(nameof(percent), percent, "A discount is between 0 and 100 percent.");

        var factor = 1m - percent / 100m;
        return items
            .Select(item => item with { Price = RoundMoney(item.Price * factor) })
            .ToList();
    }

    public static List<CartItem> ApplyCoupon(IEnumerable<CartItem> items, Coupon coupon) =>
        ApplyDiscount(items, coupon.Percent);

    // Money rounding is a POLICY, so it gets a name and lives in one place:
    // 2 decimals, halves round away from zero (0.005 -> 0.01).
    // (decimal makes the arithmetic exact; rounding decides what a customer
    // is charged when a discount lands on a fraction of a cent.)
    public static decimal RoundMoney(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
