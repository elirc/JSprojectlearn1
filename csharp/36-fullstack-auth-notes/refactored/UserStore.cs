// cs#23's user table. The design goal, in one sentence: WE NEVER LEARN YOUR
// PASSWORD. It exists in memory for the milliseconds hashing takes, then only
// the salted hash remains.
//
// Usernames are normalized (trimmed, lowercased) in ONE place, because
// "Alice" and "alice" being two accounts is a support ticket, and "Alice"
// being able to read "alice"'s notes is a security incident.

public class UserStore
{
    // One shared dummy hash, computed once at startup. See CheckPassword.
    private static readonly string DummyHash = PasswordHasher.Hash(Guid.NewGuid().ToString());

    private readonly Dictionary<string, string> _hashByUsername = new();
    private readonly object _lock = new();

    /// The canonical form of a username. Every entry point calls this, so the
    /// name stored on a note and the name resolved from a session are always
    /// spelled the same way — which is what makes ownership comparisons safe.
    public static string Normalize(string username) => username.Trim().ToLowerInvariant();

    public bool Register(string username, string password)
    {
        var name = Normalize(username);
        var hash = PasswordHasher.Hash(password);   // slow on purpose — do it outside the lock
        lock (_lock)
        {
            if (_hashByUsername.ContainsKey(name)) return false;
            _hashByUsername[name] = hash;
            return true;
        }
    }

    public bool CheckPassword(string username, string password)
    {
        var name = Normalize(username);
        string? stored;
        lock (_lock) _hashByUsername.TryGetValue(name, out stored);

        // Unknown user? Verify against a dummy hash ANYWAY, so "no such user"
        // takes the same time as "wrong password". Answering instantly for
        // unknown names would let attackers discover which usernames exist by
        // timing responses (username enumeration).
        return PasswordHasher.Verify(password, stored ?? DummyHash) && stored is not null;
    }

    public bool Exists(string username)
    {
        var name = Normalize(username);
        lock (_lock) return _hashByUsername.ContainsKey(name);
    }

    public int Count { get { lock (_lock) return _hashByUsername.Count; } }
}
