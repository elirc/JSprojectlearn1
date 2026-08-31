if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<UserStore>();       // cs#23
builder.Services.AddSingleton<SessionStore>();    // cs#23
builder.Services.AddSingleton<NoteService>();     // the ownership rules
var app = builder.Build();

app.UseDefaultFiles();   // "/" -> wwwroot/index.html
app.UseStaticFiles();    // serves wwwroot/* as-is (cs#24, cs#25)

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

app.MapPost("/api/register", (Credentials creds, UserStore users) =>
{
    var errors = new List<string>();
    if (string.IsNullOrWhiteSpace(creds.Username)) errors.Add("username is required");
    else if (creds.Username.Trim().Length > 40) errors.Add("username must be at most 40 characters");
    if (string.IsNullOrWhiteSpace(creds.Password)) errors.Add("password is required");
    else if (creds.Password.Length < 8) errors.Add("password must be at least 8 characters");
    if (errors.Count > 0) return Results.BadRequest(new { errors });

    // 409 Conflict, not 400: the request was fine, the world disagreed (cs#16).
    return users.Register(creds.Username!, creds.Password!)
        ? Results.Created("/api/me", new { registered = UserStore.Normalize(creds.Username!) })
        : Results.Conflict(new { error = "username taken" });
});

app.MapPost("/api/login", (Credentials creds, UserStore users, SessionStore sessions, HttpContext ctx) =>
{
    // One boring 401 for a bad username OR a bad password — different answers
    // would let an attacker discover which usernames exist (cs#23).
    if (creds.Username is null || creds.Password is null
        || !users.CheckPassword(creds.Username, creds.Password))
        return Results.Unauthorized();

    var user = UserStore.Normalize(creds.Username);
    ctx.SetSessionCookie(sessions.Create(user));
    return Results.Ok(new { user });
});

app.MapPost("/api/logout", (SessionStore sessions, HttpContext ctx) =>
{
    // Revoke SERVER-SIDE first: even a copied cookie is now worthless.
    sessions.Revoke(ctx.Request.Cookies[HttpAuth.CookieName]);
    ctx.ClearSessionCookie();
    return Results.Ok(new { loggedOut = true });
});

app.MapGet("/api/me", (SessionStore sessions, HttpContext ctx) =>
    ctx.CurrentUser(sessions) is { } user
        ? Results.Ok(new { user })
        : Results.Unauthorized());

// ---------------------------------------------------------------------------
// Notes — every one of these starts by asking WHO, and never by asking the
// client. There is no `?user=` anywhere in this file.
// ---------------------------------------------------------------------------

app.MapGet("/api/notes", (NoteService notes, SessionStore sessions, HttpContext ctx) =>
{
    if (ctx.CurrentUser(sessions) is not { } user) return Results.Unauthorized();
    return Results.Ok(notes.ListFor(user));      // ListFor, not All: there IS no All
});

app.MapPost("/api/notes", (NoteText dto, NoteService notes, SessionStore sessions, HttpContext ctx) =>
{
    if (ctx.CurrentUser(sessions) is not { } user) return Results.Unauthorized();

    var errors = NoteService.Validate(dto.Text);
    if (errors.Count > 0) return Results.BadRequest(new { errors });

    // The owner comes from the SESSION, never from the request body. This one
    // line is the difference between an account system and a costume party.
    var note = notes.Create(user, dto.Text!);
    return Results.Created($"/api/notes/{note.Id}", note);
});

app.MapGet("/api/notes/{id:int}", (int id, NoteService notes, SessionStore sessions, HttpContext ctx) =>
{
    if (ctx.CurrentUser(sessions) is not { } user) return Results.Unauthorized();
    return Respond(notes.Get(user, id));
});

app.MapPut("/api/notes/{id:int}", (int id, NoteText dto, NoteService notes, SessionStore sessions, HttpContext ctx) =>
{
    if (ctx.CurrentUser(sessions) is not { } user) return Results.Unauthorized();

    var errors = NoteService.Validate(dto.Text);
    if (errors.Count > 0) return Results.BadRequest(new { errors });

    return Respond(notes.Update(user, id, dto.Text!));
});

app.MapDelete("/api/notes/{id:int}", (int id, NoteService notes, SessionStore sessions, HttpContext ctx) =>
{
    if (ctx.CurrentUser(sessions) is not { } user) return Results.Unauthorized();

    var result = notes.Delete(user, id);
    return result.Access == Access.Ok ? Results.NoContent() : Respond(result);
});

app.Run("http://localhost:5036");

// The three-way translation, written once. 401 (who are you?) is handled by
// the endpoints above; this covers 200 / 404 / 403 (cs#08's Result -> HTTP).
static IResult Respond(NoteResult result) => result.Access switch
{
    Access.Ok => Results.Ok(result.Note),
    Access.NotFound => Results.NotFound(new { error = "no such note" }),
    Access.Forbidden => Results.Json(new { error = "that note is not yours" }, statusCode: 403),
    _ => Results.StatusCode(500),
};

public record Credentials(string? Username, string? Password);
public record NoteText(string? Text);
