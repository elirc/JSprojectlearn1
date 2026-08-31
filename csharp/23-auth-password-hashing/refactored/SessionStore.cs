using System.Security.Cryptography;

// Server-side sessions: the cookie carries an OPAQUE random token — a claim
// check, not an identity. The token means nothing by itself; only this
// store's table (token -> username) gives it meaning, and only the server
// holds the table. Forging a login now means guessing a 256-bit random
// value; revoking one means deleting a dictionary entry. Compare the
// original, where the cookie WAS the identity and revocation was impossible.

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
}
