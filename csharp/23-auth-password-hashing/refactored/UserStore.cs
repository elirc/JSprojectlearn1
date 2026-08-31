// The user table: username -> stored hash string. The design goal, in one
// sentence: WE NEVER LEARN YOUR PASSWORD. It exists in memory for the
// milliseconds hashing takes, then only the salted hash remains. Even a
// full dump of this store hands an attacker homework, not credentials.

public class UserStore
{
    // One shared dummy hash, computed once at startup. See CheckPassword.
    private static readonly string DummyHash = PasswordHasher.Hash(Guid.NewGuid().ToString());

    private readonly Dictionary<string, string> _hashByUsername = new();
    private readonly object _lock = new();

    public bool Register(string username, string password)
    {
        var hash = PasswordHasher.Hash(password);   // slow on purpose — do it outside the lock
        lock (_lock)
        {
            if (_hashByUsername.ContainsKey(username)) return false;
            _hashByUsername[username] = hash;
            return true;
        }
    }

    public bool CheckPassword(string username, string password)
    {
        string? stored;
        lock (_lock) _hashByUsername.TryGetValue(username, out stored);

        // Unknown user? Verify against a dummy hash ANYWAY, so "no such user"
        // takes the same time as "wrong password". Answering instantly for
        // unknown names would let attackers discover which usernames exist
        // by timing responses (js#66's enumeration lesson).
        return PasswordHasher.Verify(password, stored ?? DummyHash) && stored is not null;
    }

    // Demo-only, so you can SEE what a breach would see now (compare the
    // original's /debug/users). A real app wouldn't expose even this.
    public IReadOnlyDictionary<string, string> Snapshot()
    {
        lock (_lock) return new Dictionary<string, string>(_hashByUsername);
    }
}
