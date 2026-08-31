// The domain layer: every todo rule in one place, no HTTP anywhere in sight.
// This file doesn't know what a browser is — which is exactly why Tests.cs
// can exercise it without starting a server.

public record Todo(int Id, string Text, bool Done);

public record TodoCounts(int Total, int Active, int Done);

public class TodoService
{
    private readonly List<Todo> todos = new();
    private int nextId = 1;

    public IReadOnlyList<Todo> All => todos;

    public Todo Add(string? text)
    {
        var todo = new Todo(nextId, CleanText(text), false);
        nextId++;
        todos.Add(todo);
        return todo;
    }

    public Todo? Toggle(int id)
    {
        var index = todos.FindIndex(t => t.Id == id);
        if (index < 0) return null;
        todos[index] = todos[index] with { Done = !todos[index].Done };
        return todos[index];
    }

    // PUT semantics: change text and/or done. null means "leave it alone".
    // Returns the updated todo, or null when the id doesn't exist.
    public Todo? Update(int id, string? text, bool? done)
    {
        var index = todos.FindIndex(t => t.Id == id);
        if (index < 0) return null;
        var todo = todos[index];
        if (text is not null) todo = todo with { Text = CleanText(text) };
        if (done is not null) todo = todo with { Done = done.Value };
        todos[index] = todo;
        return todo;
    }

    public bool Remove(int id) => todos.RemoveAll(t => t.Id == id) > 0;

    // Derived, never stored: the counts are recomputed from the list each
    // time, so they can't drift out of sync with it.
    public TodoCounts Counts()
    {
        var done = todos.Count(t => t.Done);
        return new TodoCounts(todos.Count, todos.Count - done, done);
    }

    // The ONE definition of a valid todo text. The original had two
    // definitions, and they disagreed.
    private static string CleanText(string? text)
    {
        var cleaned = (text ?? "").Trim();
        if (cleaned.Length == 0)
            throw new ArgumentException("Todo text cannot be blank.");
        return cleaned;
    }
}
