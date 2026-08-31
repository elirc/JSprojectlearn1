// TodoService — ALL the decisions, ZERO HTTP. This class never sees a request,
// a response, or a status code, which is exactly why Tests.cs can exercise
// every rule by calling plain methods. (Same move as js#65's service layer.)
public class TodoService
{
    private readonly List<Todo> _todos = new();
    private int _nextId = 1;

    public IReadOnlyList<Todo> All() => _todos;

    public IReadOnlyList<Todo> Filter(string? filter) => filter switch
    {
        "done" => _todos.Where(t => t.Done).ToList(),
        "open" => _todos.Where(t => !t.Done).ToList(),
        _ => _todos.ToList(),   // unknown or missing filter: everything
    };

    public Todo? Get(int id) => _todos.FirstOrDefault(t => t.Id == id);

    /// Returns the new todo, or null if the title is missing/blank.
    public Todo? Add(string? title)
    {
        if (string.IsNullOrWhiteSpace(title)) return null;
        var todo = new Todo(_nextId++, title.Trim(), Done: false);
        _todos.Add(todo);
        return todo;
    }

    /// Returns the updated todo, or null if the id is unknown OR the title is blank.
    public Todo? Update(int id, string? title, bool done)
    {
        if (string.IsNullOrWhiteSpace(title)) return null;
        var index = _todos.FindIndex(t => t.Id == id);
        if (index < 0) return null;
        _todos[index] = _todos[index] with { Title = title.Trim(), Done = done };
        return _todos[index];
    }

    /// Flips Done. Returns the updated todo, or null if the id is unknown.
    public Todo? Toggle(int id)
    {
        var index = _todos.FindIndex(t => t.Id == id);
        if (index < 0) return null;
        _todos[index] = _todos[index] with { Done = !_todos[index].Done };
        return _todos[index];
    }

    /// True if something was actually removed.
    public bool Remove(int id) => _todos.RemoveAll(t => t.Id == id) > 0;
}
