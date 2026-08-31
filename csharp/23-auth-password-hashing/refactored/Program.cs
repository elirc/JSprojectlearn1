if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<UserStore>();
builder.Services.AddSingleton<SessionStore>();
var app = builder.Build();

// Credentials travel in a JSON body now (not the query string, where they'd
// end up in logs and shell history).
app.MapPost("/register", (Credentials creds, UserStore users) =>
{
    if (string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Password))
        return Results.BadRequest(new { error = "username and password are required" });
    if (creds.Password.Length < 8)
        return Results.BadRequest(new { error = "password must be at least 8 characters" });

    return users.Register(creds.Username, creds.Password)
        ? Results.Ok(new { registered = creds.Username })
        : Results.Conflict(new { error = "username taken" });
});

app.MapPost("/login", (Credentials creds, UserStore users, SessionStore sessions, HttpContext ctx) =>
{
    // One boring answer for bad username OR bad password — different answers
    // would let attackers test which usernames exist.
    if (creds.Username is null || creds.Password is null
        || !users.CheckPassword(creds.Username, creds.Password))
        return Results.Unauthorized();

    var token = sessions.Create(creds.Username);
    ctx.Response.Cookies.Append("session", token, new CookieOptions
    {
        HttpOnly = true,               // page JavaScript can't read it — XSS can't steal it
        SameSite = SameSiteMode.Lax,   // not sent on cross-site POSTs — blunts CSRF
        // In production, add Secure = true (HTTPS-only). Localhost demo skips it.
    });
    return Results.Ok(new { loggedIn = creds.Username });
});

app.MapGet("/me", (SessionStore sessions, HttpContext ctx) =>
{
    // The cookie holds a random token; only the server-side store can say
    // who it belongs to. A forged "session=admin" matches nothing.
    var user = sessions.UserFor(ctx.Request.Cookies["session"]);
    return user is null ? Results.Unauthorized() : Results.Ok(new { user });
});

app.MapPost("/logout", (SessionStore sessions, HttpContext ctx) =>
{
    // Revoke SERVER-SIDE first: even a copy of the cookie is now worthless.
    sessions.Revoke(ctx.Request.Cookies["session"]);
    ctx.Response.Cookies.Delete("session");
    return Results.Ok(new { loggedOut = true });
});

// Demo-only: what a breach would see NOW. Salted hashes — homework, not
// passwords. Compare the original's readable table.
app.MapGet("/debug/users", (UserStore users) => Results.Ok(users.Snapshot()));

app.Run("http://localhost:5023");

public record Credentials(string? Username, string? Password);
