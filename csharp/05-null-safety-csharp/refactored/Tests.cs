public static class Tests
{
    public static int Run()
    {
        var directory = UserDirectory.Demo();

        Console.WriteLine("FindOrNull");
        Check.Equal("Ada", directory.FindOrNull(1)?.Name, "existing user comes back");
        Check.True(directory.FindOrNull(99) is null, "missing user comes back null — not a crash");

        Console.WriteLine("TryFind");
        Check.True(directory.TryFind(1, out var ada), "returns true for an existing user");
        Check.Equal("Ada", ada?.Name, "and hands the user out");
        Check.True(!directory.TryFind(99, out var nobody), "returns false for a missing user");
        Check.True(nobody is null, "and the out value is null");

        Console.WriteLine("Greet — every path returns a string, none can throw");
        Check.Equal("Hello, ADA! We'll email you at ada@example.com",
            Greeter.Greet(directory, 1), "user with email");
        Check.Equal("Hello, GRACE! We'll email you at no email on file",
            Greeter.Greet(directory, 2), "user with null email gets the ?? fallback");
        Check.Equal("Hello, guest! (no user with id 99)",
            Greeter.Greet(directory, 99), "missing user gets the guest greeting");
        Check.Equal("Hello, guest! (no user with id -1)",
            Greeter.Greet(directory, -1), "silly ids are just another miss");

        Console.WriteLine("EmailDomain — ?. chain plus ?? fallback");
        Check.Equal("example.com", Greeter.EmailDomain(directory.FindOrNull(1)), "real email -> its domain");
        Check.Equal("(none)", Greeter.EmailDomain(directory.FindOrNull(2)), "null email -> fallback");
        Check.Equal("(none)", Greeter.EmailDomain(directory.FindOrNull(99)), "null user -> same fallback");
        Check.Equal("(none)", Greeter.EmailDomain(new User(3, "Bo", "not-an-email")), "no @ sign -> fallback");

        Console.WriteLine("Empty directory — edge of the edge");
        var empty = new UserDirectory(new List<User>());
        Check.True(empty.FindOrNull(1) is null, "empty directory finds nobody");
        Check.Equal("Hello, guest! (no user with id 1)", Greeter.Greet(empty, 1),
            "greeting still works with zero users");

        return Check.Summary();
    }
}
