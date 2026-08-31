using System.Diagnostics.CodeAnalysis;

public class UserDirectory
{
    private readonly List<User> _users;

    public UserDirectory(IEnumerable<User> users) => _users = users.ToList();

    public static UserDirectory Demo() => new(new[]
    {
        new User(1, "Ada", "ada@example.com"),
        new User(2, "Grace", null),   // legal — Email is string?, the type allows it
    });

    // Option A: return User? — "maybe a user". Callers that forget to check
    // get a compiler WARNING at the exact line that would have crashed.
    public User? FindOrNull(int id)
    {
        foreach (var user in _users)
        {
            if (user.Id == id) return user;
        }
        return null;
    }

    // Option B: the TryFind pattern (same shape as Dictionary.TryGetValue).
    // Returns "did it work?" and hands the user out through an `out` parameter.
    // [NotNullWhen(true)] teaches the compiler: "if I returned true, user isn't
    // null" — so `if (TryFind(...))` bodies can use `user` freely.
    public bool TryFind(int id, [NotNullWhen(true)] out User? user)
    {
        user = FindOrNull(id);
        return user is not null;
    }
}
