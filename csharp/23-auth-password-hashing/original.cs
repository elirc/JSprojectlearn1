#:sdk Microsoft.NET.Sdk.Web

// 23 — auth (ORIGINAL, catastrophically flawed on purpose)
//
// Register/login "auth" that commits the two classic sins:
//   1. Passwords stored as PLAINTEXT — exactly as the user typed them.
//   2. The "session" is the raw username in a cookie — which the CLIENT
//      controls, so anyone can forge being anyone.
//
// This file exists so you can SEE the horror before building the safe
// version. Never, ever ship anything shaped like this.
//
// Run:   dotnet run csharp/23-auth-password-hashing/original.cs
// Try:
//   curl -X POST "http://localhost:5023/register?username=alice&password=hunter2"
//   curl -X POST "http://localhost:5023/register?username=bob&password=hunter2"
//   curl -i -X POST "http://localhost:5023/login?username=alice&password=hunter2"
//   curl http://localhost:5023/me -b "session=alice"
//
//   The forgery — no registration, no login, no password:
//   curl http://localhost:5023/me -b "session=admin"
//        -> "logged in as admin". The server believes ANY cookie.
//
//   The horror table — every password, readable:
//   curl http://localhost:5023/debug/users
//
// (Also note: credentials in the query string means passwords land in shell
//  history and server logs. One more leak for the pile.)

var app = WebApplication.CreateBuilder(args).Build();

// username -> password. The actual password. In memory today, "just quickly
// saved to a file" tomorrow, in a leaked backup the week after.
var users = new Dictionary<string, string>();

app.MapPost("/register", (string username, string password) =>
{
    if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        return Results.BadRequest("username and password required");
    if (users.ContainsKey(username))
        return Results.BadRequest("username taken");

    users[username] = password;   // stored AS TYPED. Sin #1.
    return Results.Ok($"registered {username}");
});

app.MapPost("/login", (string username, string password, HttpContext ctx) =>
{
    // Plain == comparison of secrets. (It also bails out at the first wrong
    // character, so response TIMING leaks information — js#66 discussed why
    // secrets get compared in constant time. Here that's the LEAST of our
    // problems.)
    if (!users.TryGetValue(username, out var stored) || stored != password)
        return Results.BadRequest("wrong username or password");

    // Sin #2: the "session" is just... the username. In a cookie. Cookies
    // are sent BY THE CLIENT — we are trusting the person we're supposed
    // to be authenticating to tell us who they are.
    ctx.Response.Cookies.Append("session", username);
    return Results.Ok($"welcome, {username}");
});

app.MapGet("/me", (HttpContext ctx) =>
{
    var who = ctx.Request.Cookies["session"];
    if (who is null) return Results.Unauthorized();

    // Whatever the cookie claims, we believe. curl -b "session=admin" and
    // you ARE admin. There is no login step that can protect against a
    // check this gullible.
    return Results.Ok($"logged in as {who}");
});

app.MapPost("/logout", (HttpContext ctx) =>
{
    ctx.Response.Cookies.Delete("session");
    // Nothing server-side to revoke — the server never remembered anything.
    // If someone copied the cookie, "logout" changes nothing for them.
    return Results.Ok("logged out");
});

// The horror table. One leaked backup / one stray log line / one curious
// admin, and every user's real password (reused on their email, of course)
// is public. This endpoint just makes the blast radius visible.
app.MapGet("/debug/users", () => users);

app.Run("http://localhost:5023");
