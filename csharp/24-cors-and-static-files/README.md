# CS 24 — cors-and-static-files

**Lesson: the frontend is FILES (`wwwroot/` + fetch), not C# string
concatenation — and CORS is the explicit guest list for browsers calling your
API from another origin.**

## Run it

```
dotnet run csharp/24-cors-and-static-files/original.cs
dotnet run --project csharp/24-cors-and-static-files/refactored
dotnet run --project csharp/24-cors-and-static-files/refactored -- test
```

Open http://localhost:5024/ in a browser (both versions serve a UI), or curl:

```
curl http://localhost:5024/                       (original: server-built HTML)
curl http://localhost:5024/api/quotes             (refactored: the JSON API)
curl http://localhost:5024/api/quotes/random
curl -X POST http://localhost:5024/api/quotes -H "Content-Type: application/json" -d "{\"text\":\"Ship it.\",\"author\":\"me\"}"
```

## What's wrong with the original?

1. **The page is built by `html += ...` in C#.** Quote text goes straight into
   markup, so the seeded `"<blink>" tag & ...` quote renders as a *real tag*
   and broken entities — and a POSTed `<script>alert('hi')</script>` becomes
   executable code in every visitor's browser. That's XSS, born from one
   concatenation.
2. **No CORS headers.** Fine today only because the UI is served from the same
   origin. The day the frontend is a separate app (a Vite dev server on
   http://localhost:5173), the browser blocks every
   `fetch("http://localhost:5024/quotes")` with *"No
   'Access-Control-Allow-Origin' header is present"*. The original.cs comments
   tell the full story.
3. **HTML-in-strings is untestable and unmaintainable** — no editor help, no
   preview, and layout changes mean recompiling the backend.
4. POST accepts empty text; garbage renders forever.

## What changed in the refactor

- **`wwwroot/index.html` + `wwwroot/app.js`** — a real tiny frontend: fetch
  `/api/quotes`, render via DOM `textContent` (which *displays* `<blink>` and
  `<script>` as text instead of executing them — the escaping bug class dies),
  post new quotes as JSON. These are the js-track skills (js#14, js#65) aimed
  at a C# API.
- **`app.UseDefaultFiles(); app.UseStaticFiles();`** — `/` serves
  `wwwroot/index.html` verbatim; C# builds zero HTML.
- **API moved under `/api/`** — clean line between files and data.
- **CORS policy** — `AddCors`/`UseCors` explicitly allows the hypothetical
  second origin `http://localhost:5173`; every other origin still gets the
  browser's default wall.
- **`QuoteService`** — pure domain (list, wrap-around `Pick(roll)`, validated
  `Add`), fully unit-tested, including "dangerous text is stored verbatim —
  rendering safely is the frontend's job".

## Key takeaway

Serve UI as static files and data as JSON, and let the browser's DOM APIs do
the escaping — `textContent` can't inject. Same-origin policy means browsers
block cross-origin API calls *by default*; CORS headers are the server's
opt-in guest list, added deliberately for origins you trust, not a magic
header you sprinkle until errors stop.
