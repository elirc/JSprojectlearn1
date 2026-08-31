public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("The contract, enforced for EVERY registered cipher (current and future):");
        foreach (var cipher in CipherRegistry.All)
        {
            foreach (var sample in new[] { "hello world", "Attack At Dawn!", "", "1234 %&*" })
            {
                Check.Equal(sample, cipher.Decode(cipher.Encode(sample)),
                    $"{cipher.Name}: round-trips {(sample == "" ? "empty string" : $"\"{sample}\"")}");
            }
        }

        Console.WriteLine("Known answers (so a cipher can't 'round-trip' by doing nothing):");
        Check.Equal("uryyb", CipherRegistry.Find("rot13")!.Encode("hello"), "rot13: hello -> uryyb");
        Check.Equal("olleh", CipherRegistry.Find("reverse")!.Encode("hello"), "reverse: hello -> olleh");
        Check.Equal("zyx", CipherRegistry.Find("atbash")!.Encode("abc"), "atbash: abc -> zyx");
        Check.Equal("fyyfhp", CipherRegistry.Find("caesar5")!.Encode("attack"), "caesar5: attack -> fyyfhp");
        Check.Equal("Uryyb, Jbeyq!", CipherRegistry.Find("rot13")!.Encode("Hello, World!"),
            "case and punctuation survive");

        Console.WriteLine("The registry:");
        Check.Equal(4, CipherRegistry.All.Count, "four ciphers registered");
        Check.True(CipherRegistry.Find("rot13") is Rot13Cipher, "lookup finds the right implementation");
        Check.True(CipherRegistry.Find("ROT13") is Rot13Cipher, "lookup is case-insensitive");
        Check.True(CipherRegistry.Find(" atbash ") is AtbashCipher, "stray spaces are trimmed");
        Check.True(CipherRegistry.Find("vigenere") is null, "unknown cipher -> null, not a silent no-op");
        Check.True(CipherRegistry.Find("") is null, "empty name -> null");

        return Check.Summary();
    }
}
