// User lookup + greeting formatter — the NullReferenceException minefield.
// This mirrors typescript/05-null-safety: same lesson, C# edition.
// Run from the repo root:
//   dotnet run csharp/05-null-safety-csharp/original.cs
//
// #nullable disable = how ALL C# code worked before 2019, and how many old
// codebases still run: the compiler never asks "could this be null?"
// The refactor flips this switch on — and the compiler finds every landmine.
#nullable disable

var directory = new UserDirectory();

// Path 1: user exists, has an email. Works great. Ship it!
Console.WriteLine(Greeter.Greet(directory, 1));

// Path 2: user exists... but Email is null. No crash — worse, a QUIET bug:
// null glued into a string just vanishes. Read the end of the output line.
Console.WriteLine(Greeter.Greet(directory, 2));

// Path 3: user doesn't exist. FindUser returns null, Greet never checks,
// and user.Name explodes. We catch it here ONLY so you can read the autopsy —
// in real code this is the 500 error page.
Console.WriteLine();
Console.WriteLine("Looking up user 99...");
try
{
    Console.WriteLine(Greeter.Greet(directory, 99));
}
catch (NullReferenceException ex)
{
    Console.WriteLine($"CRASH (caught): {ex.Message}");
    Console.WriteLine("  what happened: FindUser(99) found nothing and returned null.");
    Console.WriteLine("  Greet trusted the result and called user.Name — on null.");
    Console.WriteLine("  JS equivalent: TypeError: Cannot read properties of null (reading 'name')");
}
Console.WriteLine();
Console.WriteLine("App exited cleanly — but only because of the try/catch band-aid above.");

class User
{
    public int Id;
    public string Name;
    public string Email;   // "optional" — but nothing in the type says so

    public User(int id, string name, string email)
    {
        Id = id;
        Name = name;
        Email = email;
    }
}

class UserDirectory
{
    List<User> users = new List<User>
    {
        new User(1, "Ada", "ada@example.com"),
        new User(2, "Grace", null),   // signed up before email was required
    };

    public User FindUser(int id)
    {
        foreach (var user in users)
        {
            if (user.Id == id) return user;
        }
        return null;   // "not found" — a landmine the caller can't see in the type
    }
}

static class Greeter
{
    public static string Greet(UserDirectory directory, int id)
    {
        User user = directory.FindUser(id);   // might be null. Who checks? Nobody.
        return "Hello, " + user.Name.ToUpper() + "! We'll email you at " + user.Email;
    }
}
