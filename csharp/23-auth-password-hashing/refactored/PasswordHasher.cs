using System.Security.Cryptography;

// Safe password storage, using only what ships with .NET:
//
//   PBKDF2 (Rfc2898DeriveBytes.Pbkdf2) — a deliberately SLOW one-way hash.
//   100,000 iterations of SHA-256 make each guess cost real CPU time, so a
//   leaked table of hashes resists brute force. (bcrypt/argon2 are the same
//   idea as NuGet packages; js#66 used node's scrypt.)
//
//   A random per-user SALT — mixed into the hash so two users with the same
//   password get DIFFERENT hashes, and precomputed "rainbow tables" of
//   common-password hashes match nobody. The salt is not a secret; it's
//   stored right in the string.
//
//   FixedTimeEquals — compares every byte no matter what, so how LONG the
//   comparison takes reveals nothing about how close a guess was.
//
// Stored format:  pbkdf2-sha256$<iterations>$<salt-base64>$<hash-base64>
// Self-describing on purpose: when you raise the iteration count next year,
// old entries still verify with THEIR recorded count.

public static class PasswordHasher
{
    private const int SaltSize = 16;         // 128-bit salt
    private const int HashSize = 32;         // 256-bit hash
    private const int Iterations = 100_000;

    public static string Hash(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);   // crypto-grade randomness
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);
        return $"pbkdf2-sha256${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        // Tampered or foreign-format entries verify as false, never throw —
        // an attacker who can corrupt the store shouldn't get exceptions to play with.
        var parts = stored.Split('$');
        if (parts.Length != 4 || parts[0] != "pbkdf2-sha256") return false;
        if (!int.TryParse(parts[1], out int iterations) || iterations < 1) return false;

        byte[] salt, expected;
        try
        {
            salt = Convert.FromBase64String(parts[2]);
            expected = Convert.FromBase64String(parts[3]);
        }
        catch (FormatException) { return false; }

        byte[] actual = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
