// Tests.cs — every validation rule, exercised as a pure function.
// The original's rules lived inside an endpoint reading a body stream:
// testing "is 12 too young?" required a running server and a crafted
// HTTP request. Here it's a method call.
public static class Tests
{
    static Dictionary<string, string[]> V(string? email, string? password, int? age)
        => SignupValidator.Validate(new SignupRequest(email, password, age));

    public static int Run()
    {
        Console.WriteLine("SignupValidator — happy path");
        Check.Equal(0, V("sam@site.com", "supersecret", 30).Count, "a valid signup has zero errors");
        Check.Equal(0, V("  sam@site.com  ", "12345678", 13).Count, "email is trimmed; 8-char password and age 13 are the boundaries");

        Console.WriteLine("SignupValidator — email rules");
        Check.True(V(null, "supersecret", 30).ContainsKey("email"), "missing email is reported under 'email'");
        Check.True(V("   ", "supersecret", 30).ContainsKey("email"), "blank email is an error");
        Check.True(V("plainaddress", "supersecret", 30).ContainsKey("email"), "no @ at all");
        Check.True(V("@site.com", "supersecret", 30).ContainsKey("email"), "nothing before the @");
        Check.True(V("sam@", "supersecret", 30).ContainsKey("email"), "nothing after the @");
        Check.True(V("sam@site", "supersecret", 30).ContainsKey("email"), "no dot after the @");
        Check.True(V("sam@@site.com", "supersecret", 30).ContainsKey("email"), "two @ signs");
        Check.True(V("sam smith@site.com", "supersecret", 30).ContainsKey("email"), "spaces inside");
        Check.True(!V("sam@site.co.uk", "supersecret", 30).ContainsKey("email"), "several dots after the @ are fine");

        Console.WriteLine("SignupValidator — password rules");
        Check.True(V("sam@site.com", null, 30).ContainsKey("password"), "missing password");
        Check.True(V("sam@site.com", "seven77", 30).ContainsKey("password"), "7 characters is too short");
        Check.True(!V("sam@site.com", "eight888", 30).ContainsKey("password"), "exactly 8 characters passes");

        Console.WriteLine("SignupValidator — age rules");
        Check.True(V("sam@site.com", "supersecret", null).ContainsKey("age"), "missing age");
        Check.True(V("sam@site.com", "supersecret", 12).ContainsKey("age"), "12 is too young");
        Check.True(!V("sam@site.com", "supersecret", 13).ContainsKey("age"), "13 is allowed");
        Check.True(!V("sam@site.com", "supersecret", 120).ContainsKey("age"), "120 is allowed");
        Check.True(V("sam@site.com", "supersecret", 121).ContainsKey("age"), "121 is implausible");

        Console.WriteLine("SignupValidator — errors ACCUMULATE (the whole point)");
        var all = V("not-an-email", "pw", 5);
        Check.Equal(3, all.Count, "three broken fields → three error keys in ONE response");
        Check.True(all.ContainsKey("email") && all.ContainsKey("password") && all.ContainsKey("age"),
            "every broken field is reported, not just the first");
        Check.Equal(2, V("a b@c", "supersecret", 30)["email"].Length,
            "one field can carry two messages (spaces AND missing dot)");

        Console.WriteLine("DiscountRules");
        Check.Equal(20, DiscountRules.Percent(10), "kids get 20%");
        Check.Equal(20, DiscountRules.Percent(17), "17 still counts as under 18");
        Check.Equal(0, DiscountRules.Percent(18), "18 pays full price");
        Check.Equal(0, DiscountRules.Percent(64), "64 pays full price");
        Check.Equal(30, DiscountRules.Percent(65), "65 gets the senior 30%");
        Check.Equal(30, DiscountRules.Percent(90), "so does 90");
        Check.Equal(0, DiscountRules.Percent(-5), "negative ages get 0, not a crash");

        return Check.Summary();
    }
}
