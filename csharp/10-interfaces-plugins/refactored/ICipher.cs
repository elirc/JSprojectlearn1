// The contract every cipher must honor. Anything that implements this shape
// plugs into the registry, the demo, and the tests — none of which will ever
// need to know the cipher's name in advance.
//
// The law of the contract (enforced by a registry-wide test):
//   Decode(Encode(text)) == text
public interface ICipher
{
    string Name { get; }
    string Encode(string text);
    string Decode(string text);
}
