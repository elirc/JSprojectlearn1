// A hand-rolled generic pub/sub hub — the same shape as js#38's emitter,
// built from a plain List<Action<T>> so you can see there's no magic under
// C#'s `event` keyword either.
//
// Subscribe returns an UNSUBSCRIBE action (a closure capturing exactly the
// right handler), so callers keep no bookkeeping:
//
//     var off = hub.Subscribe(msg => ...);
//     ...later...
//     off();
public class EventHub<T>
{
    private readonly List<Action<T>> handlers = new();

    public int SubscriberCount => handlers.Count;

    public Action Subscribe(Action<T> handler)
    {
        handlers.Add(handler);
        // List.Remove is a no-op returning false if the handler is already
        // gone, so calling the unsubscribe action twice is harmless.
        return () => handlers.Remove(handler);
    }

    public void Publish(T message)
    {
        // Iterate a COPY: if a handler unsubscribes (itself or a neighbour)
        // mid-delivery, mutating the live list would make foreach throw or
        // skip someone. Same trick as js#38's emitter, and it's tested.
        foreach (var handler in handlers.ToArray())
            handler(message);
    }
}
