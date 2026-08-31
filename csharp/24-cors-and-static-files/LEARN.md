# 📘 Learning Guide: CORS & Static Files

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A "quote wall": an API that stores quotes (`/api/quotes`, `/api/quotes/random`, POST to add one) plus a little web page that lists them, shows a random one on a button click, and has a form to add more.

The question this project answers: **where does the HTML come from?** The original manufactures it inside C# by gluing strings together — and promptly injects its own data into the page as live markup. The refactor serves the page as plain *files* from a `wwwroot/` folder and lets a small JavaScript file fetch the data — your js-track skills (DOM from js#14, fetch from js#65) pointed at a C# backend. Along the way we meet the browser's same-origin policy and CORS, because the moment a frontend lives on a *different* origin than its API, the browser has opinions.

Both versions run on `http://localhost:5024` — this one's worth opening in a real browser, not just curl.

## 2. Concepts you need first

### Static files and `wwwroot`
A **static file** is served byte-for-byte as it sits on disk — HTML, JS, CSS, images. No code runs to produce it. ASP.NET Core's convention: put them in a folder named `wwwroot/` inside the project, then:

```csharp
app.UseDefaultFiles();   // asking for "/" means "index.html", the web's oldest convention
app.UseStaticFiles();    // serve anything in wwwroot/ at its own path
```

Two middlewares (project 19!): the first rewrites `/` to `/index.html`, the second actually serves files. Order matters — default-files must run before static-files. Everything *not* matched by a file falls through to your API endpoints, so files and endpoints coexist in one app.

### Server-built HTML vs static page + fetch
Two architectures for "a page showing data":

1. **Server builds HTML** — every request re-renders markup on the server (fine when done with a real template engine; disastrous with string concatenation, as we'll see).
2. **Static page + fetch** — the server ships a fixed `index.html` + `app.js` once; the JS then calls a JSON API and builds the page in the browser via DOM calls.

The second is how you've worked all through the JS track, and it draws a hard line: *files* (design, layout — frontend work) versus *data* (JSON — backend work). Frontend changes stop requiring a backend recompile, and each side is testable alone.

### HTML injection and XSS — the escaping bug class
HTML has special characters: `<` starts a tag, `&` starts an entity like `&amp;`. If you paste raw text into markup, text containing those characters *becomes markup*:

```csharp
html += "<li>" + q.Text + "</li>";
// q.Text = "Use the <blink> tag & never look back"
// page now contains a REAL <blink> element and a broken &-entity
```

Annoying with `<blink>`. Catastrophic when a user submits `<script>alert('hi')</script>` — now the page *executes attacker-chosen code in every visitor's browser*. That's **XSS (cross-site scripting)**, one of the most common real-world vulnerabilities, and string-concatenated HTML is its birthplace. The classical fix is **escaping** (write `&lt;blink&gt;` so it *displays* as `<blink>`) — but the trap is that you must remember it at every single concatenation, forever.

The structural fix: don't concatenate markup at all. In the browser:

```js
element.textContent = q.text;   // sets TEXT — the browser displays < and & as characters
element.innerHTML  = q.text;    // parses MARKUP — the injection door. Avoid.
```

`textContent` *cannot* inject, no matter what the data contains. Use it and the whole bug class disappears rather than being fended off case by case.

### Origins and the same-origin policy
An **origin** is the triple *scheme + host + port*: `http://localhost:5024` and `http://localhost:5173` are **different origins** (different port!). The browser's **same-origin policy** says: JavaScript on a page may freely call its *own* origin, but responses from *other* origins are blocked unless that other server opts in.

Who is this protecting? *You, the user.* Your browser carries your cookies for every site you're logged into. Without the policy, any random page you visit could quietly `fetch("https://your-bank.example/transfer")` *with your bank cookies attached* and read the result. The browser refuses to hand other-origin responses to page scripts — by default.

Note who is *not* affected: curl, Postman, another server. They have no cookies of yours to abuse and no policy to enforce. CORS is purely a browser contract — never a security wall around the API itself.

### CORS — the server's guest list
**CORS** (Cross-Origin Resource Sharing) is how a server opts in: response headers that tell the browser "pages from origin X may read my responses". The key header:

```
Access-Control-Allow-Origin: http://localhost:5173
```

When JS on `:5173` fetches your `:5024` API, the browser checks the response for that header. Present and matching → the page gets the data. Missing → the page gets the famous error (the request often *reached* the server — the browser just refuses to deliver the response to the page):

```
Access to fetch at 'http://localhost:5024/quotes' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
on the requested resource.
```

(For "unusual" requests — like a JSON POST — browsers first send an automatic OPTIONS **preflight** request asking permission; the CORS middleware answers it for you.) In ASP.NET Core:

```csharp
builder.Services.AddCors(options =>
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
app.UseCors("frontend");
```

A named policy = a deliberate, reviewable guest list. The lazy alternative (`AllowAnyOrigin`) means "every website on earth may script against my API from its users' browsers" — occasionally right for truly public data, but it should be a decision, not a default.

### `fetch`, JSON, and camelCase (recap)
`app.js` is plain js#65-style code: `await fetch('/api/quotes')`, `await res.json()`, render. One C#-specific detail: ASP.NET Core serializes JSON in **camelCase** by convention, so C# `Text`/`Author` arrive in JS as `q.text`/`q.author`.

## 3. Walking through the original code

The heart of it:

```csharp
app.MapGet("/", () =>
{
    var html = "<html><head><title>Quote Wall</title></head><body>";
    html += "<h1>Quote Wall</h1><ul>";
    foreach (var q in quotes)
    {
        html += "<li>" + q.Text + " — <i>" + q.Author + "</i></li>";
    }
    html += "</ul><p>" + quotes.Count + " quotes</p></body></html>";
    return Results.Content(html, "text/html");
});
```

`Results.Content(html, "text/html")` returns the string as a web page. The loop pastes `q.Text` — arbitrary data — directly between tags. The seed data includes an honest quote that happens to contain `<blink>` and `&`, so the flaw fires on the very first page load, no attacker required.

The API endpoints (`/quotes`, `/quotes/random`, POST `/quotes`) are serviceable, but sit at the root next to the page, take unvalidated query strings, and — per the long comment at the bottom of the file — send no CORS headers, which is invisible *today* only because the page and API share an origin.

## 4. What's wrong with it (in beginner terms)

**1. Data became code.** The `<blink>` quote turns into a real element; view the page source and there it is, executing as markup. Now follow the comment in the POST endpoint: submit `<script>alert('hi')</script>` as a quote and reload — the browser runs it. Anyone who can add a quote can run JavaScript in every visitor's browser: steal what's on the page, redirect, impersonate. One `+` operator between "text" and "markup" is the entire bug.

**2. Escaping-by-vigilance always loses.** Sure, you could wrap every insertion in an `HtmlEscape(...)` call. All of them. In every endpoint that will ever build HTML. Forever. One forgotten call = one injection hole. Designs that require perfection from future maintainers are broken designs — pick the architecture where the safe thing is the *only* thing (textContent).

**3. The frontend is trapped inside the backend.** Want to restyle the list? Edit a C# string, rebuild, restart. No HTML tooling, no syntax highlighting, no designer handoff. And you can't unit-test "the page looks right" when the page is a thousand-character string literal.

**4. The missing CORS headers are a time bomb.** Every real project eventually runs its frontend as a separate app — a dev server with hot reload (Vite on `:5173`), or a deployed static site. The first `fetch` from that origin dies with the blocked-by-CORS error, and confused developers start cargo-culting headers at midnight. The original has no answer; the refactor has a one-policy answer written before it was needed.

**5. No validation on POST** — empty quotes render as `" — "` junk forever.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 Could the browser build the list instead of C#? What would the server need to hand it? (Just JSON — which the API endpoints already produce.)
2. 🌿 Create `wwwroot/index.html` (static skeleton: a `<ul>`, a button, a form) and `wwwroot/app.js` (fetch the quotes, `document.createElement('li')` + `textContent` per quote). Add `app.UseDefaultFiles(); app.UseStaticFiles();` and delete the HTML-building endpoint.
3. 🌳 Move the API under `/api/` and make POST take a JSON body (a `record NewQuote(string? Text, string? Author)` — project 17). Validate: blank text → 400.
4. 🍎 Extract a `QuoteService` holding the list and the rules; make the random pick testable by splitting it: service method `Pick(int roll)` (deterministic, wraps out-of-range rolls), endpoint supplies `Random.Shared.Next(...)`. Then `AddCors`/`UseCors` with a policy allowing `http://localhost:5173`, and write tests for the service.

## 6. Understanding the refactored solution

**`QuoteService.cs`** — the domain, finally alone. Two design points worth noticing. First, the seed still includes the `<blink>` quote, and a test *asserts it's stored verbatim*: text is data; the service neither escapes nor executes it. Escaping is a *rendering* concern that belongs to whoever renders — and our renderer (textContent) gets it for free. Second, the randomness split:

```csharp
public Quote Pick(int roll)
{
    if (_quotes.Count == 0) throw new InvalidOperationException("no quotes yet");
    var index = ((roll % _quotes.Count) + _quotes.Count) % _quotes.Count;
    return _quotes[index];
}
```

The *decision* (roll → which quote, wrapping any int, even negative, onto a valid index) is deterministic and tested; the *dice* (`Random.Shared.Next`) stay in the endpoint. Same separation as project 01: computing vs doing. You can't unit-test a coin flip, so keep the flip trivial and test everything around it.

**`Program.cs`** — the whole architecture in five lines:

```csharp
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("frontend");
app.MapGet("/api/quotes", (QuoteService svc) => Results.Ok(svc.GetAll()));
```

`/` is a file. `/api/*` is data. The CORS policy names its one guest, `http://localhost:5173`, in a place a code reviewer can find and question.

**`wwwroot/app.js`** — read it as the payoff of the whole js track:

```js
const li = document.createElement('li');
const text = document.createElement('span');
text.textContent = `"${q.text}"`;      // <blink> displays as text. Injection impossible.
```

Load quotes, render each through `createElement` + `textContent`, POST the form as JSON, re-render on success, show the API's error message on 400. There is no line in this file where data could become markup.

**`wwwroot/index.html`** — a static skeleton with empty containers (`<ul id="quotes">`) that JS fills. Edit its CSS while the server runs; refresh; no rebuild. That's the workflow the string-concatenation version could never have.

## 7. Words you learned (glossary)

- **Static file** — served byte-for-byte from disk (HTML/JS/CSS/images); no code runs to make it.
- **`wwwroot`** — ASP.NET Core's conventional folder for static files.
- **`UseDefaultFiles` / `UseStaticFiles`** — middleware pair: map `/` → `index.html`; serve the folder.
- **HTML entity / escaping** — writing `&lt;` so `<` displays instead of parsing; the manual defense.
- **HTML injection / XSS** — data crossing into markup/script; attacker code running in visitors' browsers.
- **`textContent` vs `innerHTML`** — sets text (cannot inject) vs parses markup (the injection door).
- **Origin** — scheme + host + port; `localhost:5024` ≠ `localhost:5173`.
- **Same-origin policy** — browsers block page JS from reading other-origin responses by default; protects users' logged-in sessions.
- **CORS** — response headers by which a server opts specific origins in; a browser contract, not an API firewall.
- **`Access-Control-Allow-Origin`** — the core CORS header: who may read this response.
- **Preflight** — the browser's automatic OPTIONS permission-check before unusual cross-origin requests.
- **CORS policy (`AddCors`/`UseCors`)** — ASP.NET Core's named, reviewable guest list.
- **camelCase JSON** — ASP.NET Core serializes C# `Text` as JS-friendly `text`.

## 8. Experiments to try on the plane (no internet needed)

Localhost servers and files only — fully offline. Use a browser where suggested; this project is about what *browsers* do.

1. **See the injection, then see it defused.** Run the original, open http://localhost:5024/ and view page source: there's a live `<blink>` element mid-quote. Now POST the script quote from the file's header comment and reload — alert box. Stop it, run the refactored server, same page, same data shape: the third quote *displays* its `<blink>` as ordinary text, and if you re-add the script quote through the form it just... sits there, inert, as a quote. `textContent` at work.
2. **Break the page on purpose (redemption of innerHTML).** In `app.js`, swap `text.textContent = ...` for `text.innerHTML = ...`, reload, and re-add a `<script>` or `<b>big</b>` quote. Watch markup execute again. Swap it back. You now know exactly which line holds the door shut. (Server tests stay green throughout — rendering safety lives in the frontend.)
3. **Trigger the real CORS error, offline.** Run the refactored server. In your browser, open *any* other localhost page — the original on :5024 won't do (same origin), so run project 22's server (`http://localhost:5022/banner`) in a second terminal, open it, press F12 → Console, and run:
   `fetch('http://localhost:5024/api/quotes').then(r => r.json()).then(console.log)`
   Expected: **blocked by CORS policy — No 'Access-Control-Allow-Origin' header**, because `:5022` isn't on the guest list. Now check the server logs: the request *arrived*; the browser discarded the response. That's the error every fullstack developer eventually meets — you just met it on your own terms.
4. **Put yourself on the guest list.** Add `"http://localhost:5022"` to `WithOrigins(...)`, restart, rerun the console fetch from the :5022 page. Expected: the quotes print. One deliberate line = one trusted origin. (curl worked the whole time — try `curl http://localhost:5024/api/quotes` and note CORS never applied to it.)
5. **Edit the frontend with the server running.** Change the page background in `index.html`'s CSS, save, refresh the browser. No rebuild, no restart. Try changing anything about the original's page for comparison: stop server, edit C# string, rebuild, rerun.
6. **Test the wrap-around logic.** Add a test: `Check.Equal(svc.GetAll()[1], svc.Pick(-2), "negative rolls wrap backwards too");` and reason out why (-2 % 3 = -2 in C#; the double-modulo turns it into 1). Expected: green — and now you know why the formula isn't just `roll % Count`.
