// The DTO: what a signup request looks like, stated once. The framework
// binds the JSON body into this record automatically — no JsonDocument,
// no TryGetProperty, no stream reading. Every field is nullable because
// clients omit fields; the VALIDATOR decides what that means.
public record SignupRequest(string? Email, string? Password, int? Age);

// SignupValidator — a pure function: request in, dictionary of problems out.
// Empty dictionary = valid. This is cs#08's accumulate-errors Result pattern:
// instead of bailing at the first problem (making the user fix-submit-repeat),
// we collect EVERY problem and report them all at once.
//
// The shape Dictionary<field, messages[]> is exactly what
// Results.ValidationProblem(...) wants — see Program.cs.
public static class SignupValidator
{
    public static Dictionary<string, string[]> Validate(SignupRequest req)
    {
        var errors = new Dictionary<string, string[]>();

        // --- email ---
        var email = req.Email?.Trim() ?? "";
        var emailErrors = new List<string>();
        if (email.Length == 0)
            emailErrors.Add("email is required");
        else
        {
            if (email.Contains(' '))
                emailErrors.Add("email must not contain spaces");
            var at = email.IndexOf('@');
            if (at <= 0 || at != email.LastIndexOf('@') || at == email.Length - 1)
                emailErrors.Add("email must be text@text — exactly one @, text on both sides");
            else if (!email[(at + 1)..].Contains('.'))
                emailErrors.Add("email needs a dot after the @, like name@site.com");
        }
        if (emailErrors.Count > 0) errors["email"] = emailErrors.ToArray();

        // --- password ---
        var password = req.Password ?? "";
        var passwordErrors = new List<string>();
        if (password.Length == 0)
            passwordErrors.Add("password is required");
        else if (password.Length < 8)
            passwordErrors.Add($"password must be at least 8 characters (got {password.Length})");
        if (passwordErrors.Count > 0) errors["password"] = passwordErrors.ToArray();

        // --- age ---
        var ageErrors = new List<string>();
        if (req.Age is not int age)
            ageErrors.Add("age is required");
        else if (age < 13)
            ageErrors.Add("you must be at least 13 to sign up");
        else if (age > 120)
            ageErrors.Add("age looks implausible (must be 120 or less)");
        if (ageErrors.Count > 0) errors["age"] = ageErrors.ToArray();

        return errors;
    }
}
