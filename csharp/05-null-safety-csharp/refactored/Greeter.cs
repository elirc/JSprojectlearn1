public static class Greeter
{
    // Guard clause first: handle "no user" and get out. After the guard, `user`
    // is guaranteed non-null — no pyramid of ifs around the happy path.
    public static string Greet(UserDirectory directory, int id)
    {
        if (!directory.TryFind(id, out var user))
        {
            return $"Hello, guest! (no user with id {id})";
        }

        // ?? = "if the left side is null, use the right side instead".
        var email = user.Email ?? "no email on file";
        return $"Hello, {user.Name.ToUpper()}! We'll email you at {email}";
    }

    // ?. = "if the thing before me is null, stop and produce null" — the whole
    // chain short-circuits, then ?? supplies the fallback. Handles BOTH
    // "no user" and "user without an email" in one line.
    public static string EmailDomain(User? user) =>
        user?.Email?.Split('@').ElementAtOrDefault(1) ?? "(none)";
}
