# 🏋️ Practice: CORS & Static Files

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Quotes by author (warm-up)

Add `QuoteService.ByAuthor(string? author)` — a case-insensitive, trimmed substring match on the author, with a blank argument meaning "all of them" — plus an `Authors` property returning each distinct author once, sorted. Then wire `GET /api/quotes?author=dijkstra` to it. Both live in the pure domain layer: no HTTP, no HTML, no escaping.
*Practices:* the pure domain layer, `StringComparison.OrdinalIgnoreCase`, and query-string binding.
**Hint:** the existing `Add`/`Pick` methods show the house style — take the `lock`, work on `_quotes`, return a fresh `ToList()` so callers can never mutate your list. `Distinct().OrderBy(a => a)` gives you `Authors`.
**Check offline:** add these Check tests to `Tests.cs` — all should pass:
```csharp
var byAuthor = new QuoteService();
Check.Equal(1, byAuthor.ByAuthor(" dijkstra ").Count, "match is case-insensitive and trimmed");
Check.Equal(0, byAuthor.ByAuthor("nobody").Count, "no match -> empty list, not null");
Check.Equal(3, byAuthor.ByAuthor("  ").Count, "a blank author means everyone");
Check.Equal(3, byAuthor.Authors.Count, "three distinct authors in the seed");
Check.Equal("A 1996 webmaster", byAuthor.Authors[0], "authors come back sorted");
```
Then `curl "http://localhost:5024/api/quotes?author=dijkstra"` → one quote.

### ⭐⭐ 2. An author filter in the UI (core)

Extend `wwwroot/index.html` and `app.js`: add a `<select id="author-filter">` that is **built from the data** (an "All authors" option plus one per distinct author), and re-fetch the list when it changes. The trap is right there: author names are user-supplied data too — the seed's `A 1996 webmaster` is harmless, but someone can add a quote signed `<img src=x onerror=alert(1)>`. Build every `<option>` with `textContent`, never by concatenating HTML.
*Practices:* DOM building without `innerHTML`, `new Set()`, `URLSearchParams`, and keeping the XSS-proof habit in a *new* place.
**Hint:** `document.createElement('option')`, then `opt.value = name; opt.textContent = name;` — the `value` attribute is set as a property, so it never becomes markup either. Build the URL with `` `/api/quotes?author=${encodeURIComponent(name)}` `` or a `URLSearchParams`.
**Check offline:** open http://localhost:5024/, add a quote whose author is `<img src=x onerror=alert(1)>`, reload. Expected: no alert box; the dropdown shows the tag *as text*. Right-click the option and Inspect: the DOM node contains a text node, not an `<img>` element. Then select that author and confirm the list filters to one quote.

### ⭐⭐ 3. Meet the preflight (core)

Your CORS policy allows any header today. Tighten it to `WithHeaders("Content-Type", "X-Client")` and learn what that actually controls by triggering a **preflight** with curl — a browser sends an `OPTIONS` request first whenever a cross-origin request is "non-simple" (a custom header, or JSON instead of a form encoding), and only sends the real request if the answer approves it.
*Practices:* how CORS really works — a browser-enforced negotiation your server answers with headers, which is why `curl` was never affected.
**Hint:** the three request headers that make an `OPTIONS` a preflight are `Origin`, `Access-Control-Request-Method` and `Access-Control-Request-Headers`. ASP.NET Core's CORS middleware answers them for you; you are only choosing what it says yes to.
**Check offline:** with the server running:
```
curl -i -X OPTIONS http://localhost:5024/api/quotes -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type,x-client"
```
→ `204 No Content` with `Access-Control-Allow-Origin: http://localhost:5173` and `Access-Control-Allow-Headers: Content-Type,X-Client`. Now repeat with `-H "Access-Control-Request-Headers: x-secret"` → the response comes back **without** an `Access-Control-Allow-Headers` line, which is how a browser is told "no". Change `Origin` to `http://localhost:9999` → no CORS headers at all.

### ⭐⭐ 4. Deep links that survive a refresh (core)

Give the page a client-side route: `/quotes/dijkstra` should load the same `index.html` and preselect that author. Today it is a `404` from the static-file middleware, because there is no such file. Add `app.MapFallbackToFile("index.html")` so any unmatched, non-`/api/` request serves the page, and read `location.pathname` in `app.js` to set the filter.
*Practices:* the SPA fallback, and middleware ordering — why the fallback must not swallow your API's 404s.
**Hint:** `MapFallbackToFile` runs *after* every mapped endpoint, so `/api/quotes` still reaches its handler; but `/api/typo` would now return HTML instead of a 404, which is worth guarding with a `app.Map("/api/{**rest}", () => Results.NotFound())` registered before the fallback.
**Check offline:** `curl -i http://localhost:5024/quotes/dijkstra` → `200` with `Content-Type: text/html` and the page body. `curl -i http://localhost:5024/api/nope` → `404`, *not* HTML. Then open http://localhost:5024/quotes/dijkstra in a browser and confirm the dropdown starts on Dijkstra and refreshing keeps it there.

### ⭐⭐⭐ 5. A second policy, and the rule that bites everyone (challenge)

Suppose the hypothetical Vite frontend needs to send cookies (project 23's session cookie). Add a second policy `"trusted"` that adds `.AllowCredentials()`, apply it to a single endpoint with `.RequireCors("trusted")` while the rest keep `"frontend"`, and then *deliberately* break it: change `WithOrigins(...)` to `AllowAnyOrigin()` in that policy and watch the app refuse to start. Read the message; it is one of the most useful error texts in ASP.NET Core.
*Practices:* per-endpoint CORS policies, `AllowCredentials`, and the spec rule that a wildcard origin and credentials are mutually exclusive.
**Hint:** `builder.Services.AddCors(o => { o.AddPolicy("frontend", ...); o.AddPolicy("trusted", ...); })` registers both; `app.UseCors("frontend")` stays the default and `app.MapGet(...).RequireCors("trusted")` overrides it for one route. `AllowCredentials` also requires the *browser* to send `credentials: 'include'` — the header alone is only half the handshake.
**Check offline:** with both policies registered,
```
curl -i -X OPTIONS http://localhost:5024/api/quotes/mine -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET"
```
→ `204` including `Access-Control-Allow-Credentials: true`, while the same preflight against `/api/quotes` has no such header. Now swap in `AllowAnyOrigin()` and restart. Expected: the app throws at startup with `InvalidOperationException: The CORS protocol does not allow specifying a wildcard (any) origin and credentials at the same time. Configure the CORS policy by listing individual origins if credentials needs to be supported.` Put `WithOrigins` back.

## Solutions

### 1. Quotes by author

```csharp
// QuoteService.cs
public IReadOnlyList<Quote> ByAuthor(string? author)
{
    lock (_lock)
    {
        if (string.IsNullOrWhiteSpace(author)) return _quotes.ToList();
        return _quotes
            .Where(q => q.Author.Contains(author.Trim(), StringComparison.OrdinalIgnoreCase))
            .ToList();
    }
}

public IReadOnlyList<string> Authors
{
    get { lock (_lock) return _quotes.Select(q => q.Author).Distinct().OrderBy(a => a).ToList(); }
}

// Program.cs
app.MapGet("/api/quotes", (QuoteService svc, string? author) => Results.Ok(svc.ByAuthor(author)));
app.MapGet("/api/authors", (QuoteService svc) => Results.Ok(svc.Authors));
```

WHY: `string? author` binds straight from the query string with no attribute, and passing `null` through to a method that already means "all" for blank input keeps one code path instead of two. Note what stayed out of the service: nothing here escapes, encodes or knows about HTTP — an author called `<img src=x>` is stored, matched and returned verbatim, exactly like the seed's `<blink>` quote, because deciding how text becomes *pixels* is the frontend's job and the frontend has one safe way to do it.

### 2. An author filter in the UI

```html
<!-- index.html, above the list -->
<label>Filter:
  <select id="author-filter">
    <option value="">All authors</option>
  </select>
</label>
```

```js
// app.js
const filter = document.getElementById('author-filter');

async function loadAuthors() {
  const res = await fetch('/api/authors');
  const authors = await res.json();
  const chosen = filter.value;
  filter.replaceChildren();

  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'All authors';
  filter.append(all);

  for (const name of authors) {
    const opt = document.createElement('option');
    opt.value = name;            // a property, not markup — never parsed as HTML
    opt.textContent = name;      // the same vaccine as the quote list
    filter.append(opt);
  }
  filter.value = chosen;         // keep the selection across a reload
}

async function loadQuotes() {
  const url = filter.value
    ? `/api/quotes?author=${encodeURIComponent(filter.value)}`
    : '/api/quotes';
  const res = await fetch(url);
  const quotes = await res.json();
  list.replaceChildren();
  for (const q of quotes) {
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = `"${q.text}"`;
    const author = document.createElement('span');
    author.className = 'author';
    author.textContent = ` — ${q.author}`;
    li.append(text, author);
    list.append(li);
  }
}

filter.addEventListener('change', loadQuotes);

// and after a successful POST, refresh both:
await loadAuthors();
await loadQuotes();
```

WHY: the interesting bug here is the one you did not write. A dropdown feels like chrome rather than content, so it is exactly where a developer reaches for `` filter.innerHTML += `<option>${name}</option>` `` — and an author named `</option><img src=x onerror=alert(1)>` would then execute. `createElement` + `textContent` + property assignment never parses anything as markup, so the same habit that protected the quote list protects the filter for free. `encodeURIComponent` is the matching discipline one layer out: the author name is *data* going into a URL, and `&` or `#` in a name would otherwise change what you asked for.

### 3. Meet the preflight

```csharp
// Program.cs
builder.Services.AddCors(options =>
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .WithHeaders("Content-Type", "X-Client")   // was AllowAnyHeader()
              .WithMethods("GET", "POST")));             // and be explicit here too
```

WHY: CORS is enforced entirely by the *browser*, and the preflight is the negotiation — for anything beyond a "simple" request (a GET, or a POST with a form-ish content type and no custom headers) the browser first asks `OPTIONS: may I send a POST with these headers, from this origin?` and refuses to send the real request unless the answer matches. That is why your `curl` calls have always worked and always will: curl is not a browser and enforces nothing. It also explains the failure mode people find so confusing — the server *did* run the request and *did* return the data, and the browser threw the response away afterwards, which is why the server log shows a happy 200 next to a red console error. Listing headers explicitly matters because `AllowAnyHeader` echoes whatever is asked for, which quietly approves headers you never intended to accept.

### 4. Deep links that survive a refresh

```csharp
// Program.cs — after all the /api/ endpoints
app.Map("/api/{**rest}", () => Results.NotFound());   // keep API 404s as 404s
app.MapFallbackToFile("index.html");                  // everything else -> the page
```

```js
// app.js — read the deep link on load
const fromPath = decodeURIComponent(location.pathname.replace(/^\/quotes\/?/, ''));

async function start() {
  await loadAuthors();
  if (fromPath) {
    const match = [...filter.options].find(o => o.value.toLowerCase().includes(fromPath.toLowerCase()));
    if (match) filter.value = match.value;
  }
  await loadQuotes();
}
start();
```

WHY: static-file middleware serves files, and `/quotes/dijkstra` is not a file — so without a fallback, the very first hard refresh on a client-side route 404s, which is the single most common "it works until you reload" bug in single-page apps. `MapFallbackToFile` registers a route with the lowest possible priority, so every real endpoint and every real file still wins; the explicit `/api/{**rest}` catch-all sits *above* it so a mistyped API path returns a JSON-shaped 404 instead of an HTML page, which is what any fetch caller expects. `{**rest}` is a catch-all route parameter — the `**` means "the rest of the path, slashes included".

### 5. A second policy, and the rule that bites everyone

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .WithHeaders("Content-Type", "X-Client")
              .WithMethods("GET", "POST"));

    options.AddPolicy("trusted", policy =>
        policy.WithOrigins("http://localhost:5173")   // MUST be explicit — see below
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());                   // cookies may ride along
});

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("frontend");                              // the default for everything

app.MapGet("/api/quotes/mine", (QuoteService svc) => Results.Ok(svc.GetAll()))
   .RequireCors("trusted");                           // ...overridden here
```

WHY: `AllowCredentials` means the browser may attach cookies and `Authorization` headers to the cross-origin call — and the CORS spec forbids combining that with `Access-Control-Allow-Origin: *`, because a wildcard plus credentials would let *any* site on the internet make authenticated requests as your logged-in user and read the answers. ASP.NET Core enforces the rule at startup rather than per-request, which is why you get a loud `InvalidOperationException` instead of a subtle hole. The per-endpoint policy is the right shape in general: CORS is a permission, and permissions should be granted narrowly rather than applied to a whole app because one route needed them. Remember the other half too — the server saying yes does nothing unless the browser's `fetch` opts in with `credentials: 'include'`.
