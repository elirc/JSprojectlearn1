// All the workflow rules, as switch EXPRESSIONS over the enum.
// Delete any case and rebuild: the compiler warns that the switch no longer
// handles every status (warning CS8509). Strings could never give you that.
public static class OrderWorkflow
{
    // What should we do next for an order in this status?
    public static string NextStep(OrderStatus status) => status switch
    {
        OrderStatus.Pending   => "send payment reminder",
        OrderStatus.Paid      => "print shipping label",
        OrderStatus.Shipped   => "email tracking number",
        OrderStatus.Delivered => "ask for a review",
        // Unreachable via normal code — but an enum variable CAN hold an
        // unnamed value like (OrderStatus)42, so we fail LOUDLY, not silently.
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "unhandled OrderStatus"),
    };

    // Cancellation policy: allowed until the parcel leaves the warehouse.
    public static bool CanCancel(OrderStatus status) => status switch
    {
        OrderStatus.Pending or OrderStatus.Paid      => true,
        OrderStatus.Shipped or OrderStatus.Delivered => false,
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "unhandled OrderStatus"),
    };

    // The one legal path through the workflow. Each transition is a case;
    // an impossible transition is an exception, not a shrug.
    public static OrderStatus Advance(OrderStatus status) => status switch
    {
        OrderStatus.Pending   => OrderStatus.Paid,
        OrderStatus.Paid      => OrderStatus.Shipped,
        OrderStatus.Shipped   => OrderStatus.Delivered,
        OrderStatus.Delivered => throw new InvalidOperationException("A delivered order has nowhere left to go."),
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "unhandled OrderStatus"),
    };

    // The border checkpoint: messy outside strings ("Paid", "SHIPPED", " pending ")
    // become clean enum values here — or get rejected. Inside the program, only
    // the enum travels.
    public static bool TryParseStatus(string text, out OrderStatus status)
    {
        if (Enum.TryParse(text.Trim(), ignoreCase: true, out OrderStatus parsed)
            && Enum.IsDefined(parsed)) // TryParse alone accepts numbers like "42"!
        {
            status = parsed;
            return true;
        }
        status = default;
        return false;
    }
}
