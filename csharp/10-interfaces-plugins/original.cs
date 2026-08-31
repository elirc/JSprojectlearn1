// 10 — Cipher toolbox, original (flawed) version.
// One Encode function with a switch on strings... and a SECOND switch for
// Decode that has already drifted out of sync. Plus a hand-written list of
// algorithms at the top. Three places that must agree — and don't.
// Run from repo root:  dotnet run csharp/10-interfaces-plugins/original.cs
//
// (These are classical puzzle ciphers for learning — for real secrets use
// System.Security.Cryptography, never hand-rolled ciphers.)

using System;

Console.WriteLine("Available algorithms: rot13, reverse, atbash");  // place #3: typed by hand
Console.WriteLine();

string[] algorithms = { "rot13", "reverse", "atbash" };
var text = "hello world";

foreach (var algo in algorithms)
{
    var encoded = Encode(algo, text);
    var decoded = Decode(algo, encoded);
    var verdict = decoded == text ? "round-trip OK" : "ROUND-TRIP BROKEN";
    Console.WriteLine($"{algo,-8} \"{text}\" -> \"{encoded}\" -> \"{decoded}\"   {verdict}");
}

Console.WriteLine();
Console.WriteLine("atbash was added to Encode... and forgotten in Decode. And the default");
Console.WriteLine("branch doesn't throw — it hands the text back unchanged — so decoding");
Console.WriteLine("just quietly returned the still-scrambled ciphertext. So does any typo:");
Console.WriteLine($"  Encode(\"rot13 \", ...) -> \"{Encode("rot13 ", text)}\"  (trailing space, silently 'encoded' as itself)");
Console.WriteLine();
Console.WriteLine("Adding a cipher here means editing THREE places: the Encode switch, the");
Console.WriteLine("Decode switch, and the hand-written list up top. Miss one and nothing");
Console.WriteLine("warns you — the default branch swallows the mistake.");

static string Encode(string algorithm, string text)
{
    switch (algorithm)
    {
        case "rot13": return Rot13(text);
        case "reverse": return Reverse(text);
        case "atbash": return Atbash(text);
        default: return text;  // unknown algorithm? just... hand the text back
    }
}

static string Decode(string algorithm, string text)
{
    switch (algorithm)  // a SECOND copy of "what ciphers exist"
    {
        case "rot13": return Rot13(text);      // rot13 undoes itself
        case "reverse": return Reverse(text);  // so does reverse
        // "atbash" was forgotten when it was added last sprint...
        default: return text;                  // ...and this shrug hides that
    }
}

static string Rot13(string text)
{
    var chars = text.ToCharArray();
    for (int i = 0; i < chars.Length; i++)
    {
        char c = chars[i];
        if (c >= 'a' && c <= 'z') chars[i] = (char)('a' + (c - 'a' + 13) % 26);
        else if (c >= 'A' && c <= 'Z') chars[i] = (char)('A' + (c - 'A' + 13) % 26);
    }
    return new string(chars);
}

static string Reverse(string text)
{
    var chars = text.ToCharArray();
    Array.Reverse(chars);
    return new string(chars);
}

static string Atbash(string text)
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
