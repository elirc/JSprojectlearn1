// The form is a record (project 07): one value, three fields, no surprises.
public record SignupForm(string Username, string Email, string Password);

public static class SignupValidator
{
    public static Result Validate(SignupForm form)
    {
        // A null form is a BUG in the calling code, not a user mistake —
        // so this one genuinely throws. Users can't send us null; only
        // broken code can. (That's the exception/result dividing line.)
        ArgumentNullException.ThrowIfNull(form);

        // Every rule runs. No early exit — errors ACCUMULATE.
        var errors = new List<string>();

        if (form.Username.Length < 3)
            errors.Add("username must be at least 3 characters");
        if (form.Username.Contains(' '))
            errors.Add("username cannot contain spaces");
        if (!form.Email.Contains('@'))
            errors.Add("email must contain an @");
        if (form.Password.Length < 8)
            errors.Add("password must be at least 8 characters");
        if (!form.Password.Any(char.IsDigit))
            errors.Add("password needs at least one digit");

        return errors.Count == 0 ? Result.Success() : Result.Failure(errors);
    }
}
