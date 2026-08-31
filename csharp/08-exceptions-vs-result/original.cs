// 08 — Signup validator, original (flawed) version.
// Every rule THROWS, so the user learns their mistakes one submit at a time —
// and the caller uses try/catch as everyday control flow.
// Run from repo root:  dotnet run csharp/08-exceptions-vs-result/original.cs

using System;
using System.Linq;

// The user filled the signup form like this — THREE things wrong at once:
var username = "al";                 // too short
var email = "al.example.com";        // no @
var password = "short";              // too short AND no digit

Console.WriteLine("=== Attempt 1 ===");
TrySubmit(username, email, password);

Console.WriteLine("The user fixes the ONE thing we mentioned, and resubmits...");
username = "alice";

Console.WriteLine("=== Attempt 2 ===");
TrySubmit(username, email, password);

Console.WriteLine("Fixes that too. Surely done now?");
email = "alice@example.com";

Console.WriteLine("=== Attempt 3 ===");
TrySubmit(username, email, password);

Console.WriteLine("Sigh. Lengthens the password...");
password = "longenough";

Console.WriteLine("=== Attempt 4 ===");
TrySubmit(username, email, password);

Console.WriteLine("...and STILL fails, because rule #5 was hiding behind rule #4.");
password = "longenough7";

Console.WriteLine("=== Attempt 5 ===");
TrySubmit(username, email, password);

Console.WriteLine("FIVE round trips to discover four problems. The validator knew");
Console.WriteLine("about all of them on attempt 1 — but `throw` can only carry the");
Console.WriteLine("first one it hits, and the catch block can't ask for the rest.");

void TrySubmit(string user, string mail, string pass)
{
    try
    {
        Validate(user, mail, pass);
        Console.WriteLine($"  OK — welcome, {user}! Account created.");
    }
    catch (Exception ex)  // exceptions as everyday control flow
    {
        Console.WriteLine($"  Sorry: {ex.Message}");
    }
    Console.WriteLine();
}

void Validate(string user, string mail, string pass)
{
    // Each rule bails out at the FIRST failure — the rest never run.
    if (user.Length < 3) throw new Exception("username must be at least 3 characters");
    if (user.Contains(' ')) throw new Exception("username cannot contain spaces");
    if (!mail.Contains('@')) throw new Exception("email must contain an @");
    if (pass.Length < 8) throw new Exception("password must be at least 8 characters");
    if (!pass.Any(char.IsDigit)) throw new Exception("password needs at least one digit");
}
