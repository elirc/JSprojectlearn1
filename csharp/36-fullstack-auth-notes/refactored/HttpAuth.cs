// The bridge between HTTP and the session store — extension methods on
// HttpContext (cs#13), so endpoints read like sentences.
//
// The important property is that this is the ONLY place a request is turned
// into a username. No endpoint reads `Request.Cookies` itself, and none of
// them accept a name from the caller. If you want to change how identity is
// carried — a bearer header, a different cookie name, a signed token — you
// edit this file and nothing else.

public static class HttpAuth
{
    public const string CookieName = "session";

    /// Who is calling? `null` means nobody — the endpoint answers 401.
    /// Note what is NOT a parameter: anything the client controls except the
    /// cookie value, which is meaningless without the server's own table.
    public static string? CurrentUser(this HttpContext ctx, SessionStore sessions)
        => sessions.UserFor(ctx.Request.Cookies[CookieName]);

    public static void SetSessionCookie(this HttpContext ctx, string token)
        => ctx.Response.Cookies.Append(CookieName, token, new CookieOptions
        {
            HttpOnly = true,               // page JavaScript can't read it — XSS can't steal it
            SameSite = SameSiteMode.Lax,   // not sent on cross-site POSTs — blunts CSRF
            Path = "/",
            // In production, add Secure = true (HTTPS-only). Localhost demo skips it.
        });

    public static void ClearSessionCookie(this HttpContext ctx)
        => ctx.Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/" });
}
