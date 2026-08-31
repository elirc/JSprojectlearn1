public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("Happy path:");
        var good = SignupValidator.Validate(new SignupForm("alice", "alice@example.com", "longenough7"));
        Check.True(good.Ok, "a valid form passes");
        Check.Equal(0, good.Errors.Count, "a valid form has zero errors");

        Console.WriteLine("ALL errors are collected (the original only ever showed the first):");
        var bad = SignupValidator.Validate(new SignupForm("al", "al.example.com", "short"));
        Check.Equal(false, bad.Ok, "an invalid form fails");
        Check.Equal(4, bad.Errors.Count, "all four problems reported at once");
        Check.True(bad.Errors.Contains("username must be at least 3 characters"), "short username reported");
        Check.True(bad.Errors.Contains("email must contain an @"), "bad email reported");
        Check.True(bad.Errors.Contains("password must be at least 8 characters"), "short password reported");
        Check.True(bad.Errors.Contains("password needs at least one digit"), "digit-less password reported");

        Console.WriteLine("Single-failure cases:");
        var oneError = SignupValidator.Validate(new SignupForm("al ice", "alice@example.com", "longenough7"));
        Check.Equal(1, oneError.Errors.Count, "exactly one error for one problem");
        Check.Equal("username cannot contain spaces", oneError.Errors[0], "and it's the right one");

        Console.WriteLine("Boundaries:");
        Check.True(SignupValidator.Validate(new SignupForm("abc", "a@b", "abcdefg1")).Ok, "minimum legal values pass");
        Check.Equal(false, SignupValidator.Validate(new SignupForm("ab", "a@b", "abcdefg1")).Ok, "one char short fails");

        Console.WriteLine("Exceptions are still for genuine bugs:");
        Check.Throws<ArgumentNullException>(
            () => SignupValidator.Validate(null!),
            "a null form is a programmer error -> throws");
        Check.Throws<ArgumentException>(
            () => Result.Failure(new List<string>()),
            "a Failure with zero errors is a programmer error -> throws");

        return Check.Summary();
    }
}
