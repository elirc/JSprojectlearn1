// The original did `new EmailStub().Send(...)` INSIDE the endpoint — no way
// to fake it. As an interface, production gets the console version and
// tests get a FakeNotifier that just records what would have been sent.
public interface INotifier
{
    void Notify(string message);
}

public class ConsoleNotifier : INotifier
{
    public void Notify(string message) => Console.WriteLine($"[notify] {message}");
}
