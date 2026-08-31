// The full list of statuses, in ONE place, spelled ONE way.
// A typo like OrderStatus.Payed is now a compile error, not a silent branch miss.
public enum OrderStatus
{
    Pending,
    Paid,
    Shipped,
    Delivered,
}
