using System.Security.Cryptography;

// cs#23's session store, with one addition: RevokeAllFor, because a notes app
// with real accounts eventually needs "log me out everywhere".
//
// The cookie carries an OPAQUE random token — a claim check, not an identity.
// The token means nothing by itself; only this store's table (token -> user)
// gives it meaning, and only the server holds the table. Forging a login means
// guessing a 256-bit random value. Compare the original, where the cookie —
// sorry, the *query string* — WAS the identity.

public class SessionStore
{
    private readonly Dictionary<string, string> _userByToken = new();
    private readonly object _lock = new();

    public string Create(string username)
    {
        // 32 random bytes from the OS crypto source -> 64 hex chars.
        // (Random.Shared is fine for games, NEVER for tokens — it's predictable.)
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        lock (_lock) _userByToken[token] = username;
        return token;
    }

    /// The only question the app ever asks: whose token is this, if anyone's?
    public string? UserFor(string? token)
    {
        if (token is null) return null;
        lock (_lock) return _userByToken.TryGetValue(token, out var user) ? user : null;
    }

    public bool Revoke(string? token)
    {
        if (token is null) return false;
        lock (_lock) return _userByToken.Remove(token);
    }

    /// Kills every session for one user — the "stolen laptop" button. This is
    /// what a server-side session table can do that a self-contained signed
    /// token cannot: the server remains the authority, so it can change its mind.
    public int RevokeAllFor(string username)
    {
        lock (_lock)
        {
            // Collect first: removing while enumerating a Dictionary throws.
            var doomed = _userByToken.Where(kv => kv.Value == username).Select(kv => kv.Key).ToList();
            foreach (var token in doomed) _userByToken.Remove(token);
            return doomed.Count;
        }
    }

    public int Count { get { lock (_lock) return _userByToken.Count; } }
}
