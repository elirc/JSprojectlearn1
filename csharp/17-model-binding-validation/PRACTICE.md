# 🏋️ Practice: Model Binding & Validation

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. A username field (warm-up)

Add `Username` to `SignupRequest` and validate it: required, 3–20 characters after trimming, and only
letters, digits, or `_`. Errors go under the `"username"` key, and a bad username must *accumulate*
alongside the other fields' errors. Update `Tests.cs`'s `V` helper for the extra parameter.
*Practices:* growing a DTO + adding an accumulated rule in the pure validator.
**Hint:** `username.All(c => char.IsAsciiLetterOrDigit(c) || c == '_')` checks the charset in one line.
**Check offline:** `Check.True(V("sam@site.com", "supersecret", 30, "ab").ContainsKey("username"), "2 chars is too short")` passes, and the happy-path tests still show zero errors.

### ⭐⭐ 2. Confirm the password (core)

Add `PasswordConfirm` to the DTO. When a password was supplied and the confirmation doesn't match it
exactly (case matters!), report `"passwords do not match"` under `"passwordConfirm"`. When the
password itself is missing, *don't* pile on a mismatch error too — one problem, one message.
*Practices:* cross-field validation — a rule that reads two fields at once.
**Hint:** guard with `password.Length > 0` before comparing; `req.PasswordConfirm != req.Password`
handles null-vs-value correctly for strings.
**Check offline:** add this Check test — it should pass:
`Check.True(V("s@x.com", "supersecret", 30, "sam", "supersecreT").ContainsKey("passwordConfirm"), "case matters");`

### ⭐⭐ 3. A shipping-cost endpoint (core)

Add `GET /shipping?weight=2.5` answering `{"weight":2.5,"cost":9.99}`. The policy, in a new pure
`ShippingRules.Cost(decimal weightKg)`: 0 or less → 0; up to 1 kg → 4.99; up to 5 kg → 9.99; up to
20 kg → 19.99; heavier → 49.99. `?weight=abc` must cost you *zero lines of parsing code*.
*Practices:* binding a `decimal` from the query + a switch expression with relational patterns.
**Hint:** copy `DiscountRules`' shape; relational patterns (`<= 1 =>`) work on `decimal` too.
**Check offline:** `Check.Equal(9.99m, ShippingRules.Cost(1.01m), "just over 1kg jumps a tier")` passes;
`curl -i "http://localhost:5017/shipping?weight=abc"` → `400` before your handler runs.

### ⭐⭐ 4. A second form: /feedback (core)

Add `POST /feedback` taking `{"message":"...","rating":4}`. Rules: message required, 10–500 chars
after trimming; rating required, 1–5. Same contract as `/signup`: all errors at once via
`Results.ValidationProblem`, `200` with a thank-you otherwise.
*Practices:* building a DTO + validator + endpoint trio from scratch — the project's whole pattern, solo.
**Hint:** three files' worth of pattern to imitate: record → static `Validate` → two-line endpoint.
**Check offline:** `curl -s -X POST http://localhost:5017/feedback -H "Content-Type: application/json" -d "{\"message\":\"short\",\"rating\":9}"` → one 400 whose `errors` has **both** `message` and `rating`.

### ⭐⭐⭐ 5. Password must not contain your email name (challenge)

`samantha@site.com` with password `xxSAMANTHAxx` is a gift to attackers. Add a rule: when the email
has text before its `@` (the *local part*) of 3+ characters, and the password (already 8+ chars)
contains that local part case-insensitively, add `"password must not contain your email name"` under
`"password"`. Shorter local parts are exempt (`ab@x.com` would forbid too much).
*Practices:* a cross-field rule with guards — and the pure validator is the only file that changes.
**Hint:** `email[..email.IndexOf('@')]` slices the local part; `Contains(localPart, StringComparison.OrdinalIgnoreCase)` compares.
**Check offline:** add this Check test — it should pass:
`Check.True(V("samantha@site.com", "xxSAMANTHAxx", 30).ContainsKey("password"), "email name inside password is rejected");`

## Solutions

### 1. Username

```csharp
// Signup.cs — the record grows
public record SignupRequest(string? Email, string? Password, int? Age, string? Username);

// Signup.cs — inside Validate, before `return errors;`
var username = req.Username?.Trim() ?? "";
var usernameErrors = new List<string>();
if (username.Length == 0)
    usernameErrors.Add("username is required");
else
{
    if (username.Length < 3 || username.Length > 20)
        usernameErrors.Add("username must be 3-20 characters");
    if (!username.All(c => char.IsAsciiLetterOrDigit(c) || c == '_'))
        usernameErrors.Add("username may only contain letters, digits, and _");
}
if (usernameErrors.Count > 0) errors["username"] = usernameErrors.ToArray();

// Tests.cs — the helper grows a defaulted parameter so old calls still compile
static Dictionary<string, string[]> V(string? email, string? password, int? age, string? username = "sam_99")
    => SignupValidator.Validate(new SignupRequest(email, password, age, username));
```

WHY: the DTO states what *may arrive*, the validator what's *acceptable* — so both change, nothing
else does. Note the two username rules are `if`+`if`, not `else if`: `"x!"` is both too short and
badly charactered, and accumulation applies within a field just like across fields.

### 2. Confirm password

```csharp
// Signup.cs — record (with exercise 1's field too)
public record SignupRequest(string? Email, string? Password, int? Age, string? Username, string? PasswordConfirm);

// Signup.cs — right after the password block
if (password.Length > 0 && req.PasswordConfirm != req.Password)
    errors["passwordConfirm"] = new[] { "passwords do not match" };

// Tests.cs — V grows once more; defaulting the confirmation to the password
// keeps every earlier test green without editing it
static Dictionary<string, string[]> V(string? email, string? password, int? age,
    string? username = "sam_99", string? passwordConfirm = null)
    => SignupValidator.Validate(new SignupRequest(email, password, age, username, passwordConfirm ?? password));
```

WHY: the guard makes the errors *independent*: a missing password already has its message, and adding
"doesn't match nothing" would just be noise. String `!=` is value comparison in C# (and `null != "x"`
is safely true), so the one-liner covers missing-confirmation and wrong-confirmation alike.

### 3. Shipping

```csharp
// ShippingRules.cs — new file, same shape as DiscountRules.cs
public static class ShippingRules
{
    public static decimal Cost(decimal weightKg) => weightKg switch
    {
        <= 0 => 0m,      // nonsense weights ship free rather than crash
        <= 1 => 4.99m,
        <= 5 => 9.99m,
        <= 20 => 19.99m,
        _ => 49.99m,
    };
}

// Program.cs
app.MapGet("/shipping", (decimal weight) => new { weight, cost = ShippingRules.Cost(weight) });
```

WHY: declaring `(decimal weight)` buys the same free 400 that `(int age)` bought `/discount` — the
handler never sees `abc`, and there is no `decimal.Parse` anywhere for a German locale or a typo to
break. The arms are ordered smallest-first because a `switch` takes the first arm that matches.

### 4. Feedback

```csharp
// Feedback.cs — new file
public record FeedbackRequest(string? Message, int? Rating);

public static class FeedbackValidator
{
    public static Dictionary<string, string[]> Validate(FeedbackRequest req)
    {
        var errors = new Dictionary<string, string[]>();

        var message = req.Message?.Trim() ?? "";
        var messageErrors = new List<string>();
        if (message.Length == 0) messageErrors.Add("message is required");
        else if (message.Length < 10) messageErrors.Add("message must be at least 10 characters");
        else if (message.Length > 500) messageErrors.Add("message must be 500 characters or fewer");
        if (messageErrors.Count > 0) errors["message"] = messageErrors.ToArray();

        var ratingErrors = new List<string>();
        if (req.Rating is not int rating) ratingErrors.Add("rating is required");
        else if (rating is < 1 or > 5) ratingErrors.Add("rating must be between 1 and 5");
        if (ratingErrors.Count > 0) errors["rating"] = ratingErrors.ToArray();

        return errors;
    }
}

// Program.cs
app.MapPost("/feedback", (FeedbackRequest body) =>
{
    var errors = FeedbackValidator.Validate(body);
    return errors.Count > 0
        ? Results.ValidationProblem(errors)
        : Results.Ok(new { message = "thanks for the feedback!" });
});
```

WHY: same skeleton as signup on purpose — a client that already handles one ProblemDetails 400 handles
this endpoint for free, which is the entire argument for the standard envelope. `rating is < 1 or 5`
would be a bug; `is < 1 or > 5` combines two relational patterns, and the `is not int rating` line is
the same null-unwrap trick the age rule uses.

### 5. Email name inside the password

```csharp
// Signup.cs — extend the password block (email was computed above it)
else if (password.Length < 8)
    passwordErrors.Add($"password must be at least 8 characters (got {password.Length})");
else
{
    var at = email.IndexOf('@');
    if (at > 0)
    {
        var localPart = email[..at];
        if (localPart.Length >= 3 && password.Contains(localPart, StringComparison.OrdinalIgnoreCase))
            passwordErrors.Add("password must not contain your email name");
    }
}
```

WHY: hanging the rule off the `else` chain means it only fires once length is satisfied — one problem
at a time *within* the chain, while still accumulating across fields. It reads `email`, which the
validator already normalized ten lines up: cross-field rules are trivial in a pure function and
miserable inside the original's stream-digging endpoint, which is the lesson in one sentence. The
3-character guard keeps the rule from banning half the alphabet for `ab@x.com`.
