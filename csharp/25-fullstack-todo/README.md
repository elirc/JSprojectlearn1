# CS 25 — Fullstack todo

**Lesson: a fullstack app is one contract — a JSON API — with a thin client
on one side and a thin server on the other. Write each rule once, on the
side that owns it.**

## Run it

```
dotnet run csharp/25-fullstack-todo/original.cs
dotnet run --project csharp/25-fullstack-todo/refactored
dotnet run --project csharp/25-fullstack-todo/refactored -- test
```

Then open http://localhost:5025 in a browser (one app at a time — they share
the port). Add, toggle, delete. Watch the tab: the original reloads the whole
page on every click; the refactor never reloads at all.

## What's wrong with the original?

1. **Every click is a full page reload.** Each button is a `<form>` that
   POSTs and redirects back to `/`, so the server re-renders the entire page
   to change one checkbox. The typed-but-unsubmitted input? Gone.
2. **The todo rules exist twice.** The HTML endpoints and the JSON API each
   have their own add/toggle/delete logic — and the copies already disagree:
   the form accepts `"   "` as a todo, the API trims it. Fix a rule in one
   place and the other keeps the bug (js#65's smeared-rules problem, doubled).
3. **Everything lives in lambdas.** There is no function you can call from a
   test. The only way to check any rule is to boot the server and click.
4. **The API lies with status codes**: create returns 200 instead of 201,
   and toggling or deleting an id that doesn't exist still says "OK".
5. Bonus: todo text is pasted into the HTML string unescaped — type
   `<b>hi</b>` and it renders as markup (the js#14 XSS habit).

## What changed in the refactor

- **`TodoService` is the single copy of the rules** — add (trim + reject
  blank), toggle, update, remove, counts. Pure C#, no HTTP, fully covered by
  `Tests.cs` (the cs#15/#18 pattern, finally end-to-end).
- **The endpoints only translate**: HTTP in → service call → status code out.
  201 Created with a Location header, 204 No Content, 404 with a JSON error
  body, 400 for blank text. Proper REST (cs#16) on `/api/todos`.
- **The frontend is data → render** (js#14 in the browser): fetch the list,
  redraw everything from it, and after any change simply re-fetch. No DOM
  bookkeeping, no partial patches, no reloads — and a real empty-state
  instead of a blank `<ul>`.
- **`wwwroot` + `UseStaticFiles`** (cs#24): the server ships the page but
  never builds HTML strings again.
- LEARN.md traces one click through the whole stack: click → fetch → route →
  service → JSON → render. Once you can follow that loop, every web app you
  meet is the same loop with more nouns.

## Key takeaway

Decide where each responsibility lives and keep it there: the browser owns
rendering, the endpoints own translation, the service owns the rules. The
question from project 01 — "how would I test this?" — now has a fullstack
answer: if a rule can't be tested without a browser, it's on the wrong side
of the contract.
