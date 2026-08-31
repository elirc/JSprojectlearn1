if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// The help text is DERIVED from the registry — it can't go stale.
Console.WriteLine($"Available algorithms: {string.Join(", ", CipherRegistry.Names)}");
Console.WriteLine();

var text = "hello world";
foreach (var cipher in CipherRegistry.All)
{
    var encoded = cipher.Encode(text);
    var decoded = cipher.Decode(encoded);
    var verdict = decoded == text ? "round-trip OK" : "ROUND-TRIP BROKEN";
    Console.WriteLine($"{cipher.Name,-8} \"{text}\" -> \"{encoded}\" -> \"{decoded}\"   {verdict}");
}

Console.WriteLine();
Console.WriteLine("Unknown names are handled in ONE place, loudly:");
foreach (var name in new[] { "ROT13", "vigenere" })
{
    var cipher = CipherRegistry.Find(name);
    Console.WriteLine(cipher is null
        ? $"  \"{name}\" -> not found. Try one of: {string.Join(", ", CipherRegistry.Names)}"
        : $"  \"{name}\" -> found {cipher.Name} (lookup is case-insensitive)");
}

Console.WriteLine();
Console.WriteLine("Notice this file names no cipher. Add one (a class + a registry line)");
Console.WriteLine("and this demo, the help text, and the tests all pick it up unchanged.");
