// Each cipher is a small class implementing ICipher. They share one helper
// (ShiftLetters) — good pieces keep getting reused.
// (Classical puzzle ciphers for learning — real secrets use
// System.Security.Cryptography.)

public class Rot13Cipher : ICipher
{
    public string Name => "rot13";
    public string Encode(string text) => CipherMath.ShiftLetters(text, 13);
    public string Decode(string text) => CipherMath.ShiftLetters(text, 13);  // 13 + 13 = 26 = full circle
}

public class ReverseCipher : ICipher
{
    public string Name => "reverse";

    public string Encode(string text)
    {
        var chars = text.ToCharArray();
        Array.Reverse(chars);
        return new string(chars);
    }

    public string Decode(string text) => Encode(text);  // reversing twice restores
}

public class AtbashCipher : ICipher
{
    public string Name => "atbash";

    public string Encode(string text)
    {
        var chars = text.ToCharArray();
        for (int i = 0; i < chars.Length; i++)
        {
            char c = chars[i];
            if (c >= 'a' && c <= 'z') chars[i] = (char)('z' - (c - 'a'));
            else if (c >= 'A' && c <= 'Z') chars[i] = (char)('Z' - (c - 'A'));
        }
        return new string(chars);
    }

    public string Decode(string text) => Encode(text);  // the mirror mirrors back
}

// Added AFTER the original three, as the extensibility demo: one new class
// here + one line in the registry. Encode and Decode genuinely differ, so
// the round-trip test earns its keep.
public class Caesar5Cipher : ICipher
{
    public string Name => "caesar5";
    public string Encode(string text) => CipherMath.ShiftLetters(text, 5);
    public string Decode(string text) => CipherMath.ShiftLetters(text, 21);  // 5 + 21 = 26
}

// Shared mechanics, written once.
public static class CipherMath
{
    public static string ShiftLetters(string text, int shift)
    {
        var chars = text.ToCharArray();
        for (int i = 0; i < chars.Length; i++)
        {
            char c = chars[i];
            if (c >= 'a' && c <= 'z') chars[i] = (char)('a' + (c - 'a' + shift) % 26);
            else if (c >= 'A' && c <= 'Z') chars[i] = (char)('A' + (c - 'A' + shift) % 26);
        }
        return new string(chars);
    }
}
