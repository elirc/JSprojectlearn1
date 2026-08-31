using System.Security.Cryptography;

// Lifted from cs#23, unchanged in substance — which is the point of a capstone:
// the security-critical code is the code you do NOT reinvent. Read cs#23's
// LEARN.md for the full derivation; the short version:
//
//   PBKDF2 (Rfc2898DeriveBytes.Pbkdf2) — a deliberately SLOW one-way hash.
//   100,000 iterations of SHA-256 make each guess cost real CPU time, so a
//   leaked table of hashes resists brute force.
//
//   A random per-user SALT — so two users with the same password get different
//   hashes, and precomputed "rainbow tables" match nobody. Not a secret.
//
//   FixedTimeEquals — compares every byte no matter what, so how LONG the
//   comparison takes reveals nothing about how close a guess was.
//
// Stored format:  pbkdf2-sha256$<iterations>$<salt-base64>$<hash-base64>
// Self-describing, so raising the iteration count next year doesn't invalidate
// everybody's password.

public static class PasswordHasher
{
    private const int SaltSize = 16;         // 128-bit salt
    private const int HashSize = 32;         // 256-bit hash
    public const int Iterations = 100_000;

    public static string Hash(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);   // crypto-grade randomness
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);
        return $"pbkdf2-sha256${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        // Tampered or foreign-format entries verify as false, never throw.
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
