// The domain: one immutable shape, one class that owns the collection and
// the rules. No HTTP anywhere — Tests.cs exercises all of it directly.
public record Book(int Id, string Title, string Author);

// What clients send when creating/replacing. Nullable on purpose: clients
// omit fields, and the rules below decide what that means.
public record BookInput(string? Title, string? Author);

public class BookStore
{
    private readonly List<Book> _books = new();
    private int _nextId = 1;

    public IReadOnlyList<Book> All() => _books;

    public Book? Get(int id) => _books.FirstOrDefault(b => b.Id == id);

    /// Returns the new book, or null when the title is missing/blank.
    /// A missing author is allowed and stored as "unknown".
    public Book? Add(string? title, string? author)
    {
        if (string.IsNullOrWhiteSpace(title)) return null;
        var book = new Book(
            _nextId++,
            title.Trim(),
            string.IsNullOrWhiteSpace(author) ? "unknown" : author.Trim());
        _books.Add(book);
        return book;
    }

    /// Full replacement (what PUT means). Returns the updated book,
    /// or null when the id is unknown OR the title is blank.
    public Book? Update(int id, string? title, string? author)
    {
        if (string.IsNullOrWhiteSpace(title)) return null;
        var index = _books.FindIndex(b => b.Id == id);
        if (index < 0) return null;
        _books[index] = _books[index] with
        {
            Title = title.Trim(),
            Author = string.IsNullOrWhiteSpace(author) ? "unknown" : author.Trim(),
        };
        return _books[index];
    }

    /// True when a book was actually removed.
    public bool Remove(int id) => _books.RemoveAll(b => b.Id == id) > 0;
}
