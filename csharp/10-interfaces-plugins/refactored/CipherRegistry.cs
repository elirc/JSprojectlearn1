// THE single place that knows which ciphers exist. Adding one = one class
// + one line in this list. The lookup, the demo's help text, and the entire
// test suite derive from here, so none of them can drift out of sync.
public static class CipherRegistry
{
    public static readonly IReadOnlyList<ICipher> All = new ICipher[]
    {
        new Rot13Cipher(),
        new ReverseCipher(),
        new AtbashCipher(),
        new Caesar5Cipher(),  // added later: one class + this line. Nothing else changed.
    };

    // Built FROM the list — names can never disagree with the ciphers.
    // Case-insensitive on purpose: "ROT13" from a shouting import still works
    // (project 06's casing lesson, applied at a lookup).
    private static readonly Dictionary<string, ICipher> ByName =
        All.ToDictionary(cipher => cipher.Name, StringComparer.OrdinalIgnoreCase);

    // Unknown name -> null, and the nullable type makes callers deal with it
    // (project 05). No silent "return the text unchanged" anywhere.
    public static ICipher? Find(string name) =>
        ByName.TryGetValue(name.Trim(), out var cipher) ? cipher : null;

    public static IEnumerable<string> Names => All.Select(cipher => cipher.Name);
}
