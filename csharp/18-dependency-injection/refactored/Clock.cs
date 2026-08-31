// Time as a dependency. "What day is it?" is an INPUT to the daily-quote
// rule — hard-wiring DateTime.Now hides that input and makes the rule
// untestable. Behind an interface, tests can make it any day they like.
public interface IClock
{
    DateTime Now { get; }
}

public class SystemClock : IClock
{
    public DateTime Now => DateTime.Now;
}
