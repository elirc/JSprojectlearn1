# CS 34 — pagination-filtering

**Lesson: a list endpoint is a contract about *how much*. Typed query
parameters, a normalized `PageRequest`, one tested `Paginator`, and an envelope
that says how many — versus 10,000 rows and "the frontend filters it".**

## Run it

```
dotnet run csharp/34-pagination-filtering/original.cs
dotnet run --project csharp/34-pagination-filtering/refactored
dotnet run --project csharp/34-pagination-filtering/refactored -- test
```

Original (http://localhost:5034) — the console prints the payload size, and
four query strings return 500:

```
curl -s http://localhost:5034/products > NUL      -> console: ~1,000,000 bytes. Per request.
curl "http://localhost:5034/products/page?page=0" -> products 1..20
curl "http://localhost:5034/products/page?page=1" -> products 21..40  (page 1 is page two)
curl -i "http://localhost:5034/products/page?page=-1"  -> 500 (also =abc, =9999, ?sort=pirce)
```

Refactored (same port; one endpoint, an envelope, and no 500s available):

```
curl "http://localhost:5034/products"                    -> 20 items + totalItems/totalPages
curl "http://localhost:5034/products?page=2&pageSize=5&search=mug&sort=-price"
curl "http://localhost:5034/products?page=-3&pageSize=999999" -> clamped: page 1, 100 items
curl -i "http://localhost:5034/products?page=abc"        -> 400, before our code runs
curl -i "http://localhost:5034/products?sort=pirce"      -> 400 listing the allowed fields
```

## What's wrong with the original?

1. **`GET /products` returns all 10,000 rows** — about a megabyte per request —
   so the browser can throw away 9,980 on every keystroke. The comment
   defending this is the actual bug.
2. **Page 1 is the second page.** `page * 20` makes `?page=0` first, so every
   client that counts from 1 silently skips twenty products.
3. **Four query strings return 500**: `int.Parse` on junk, `GetRange` negative,
   `GetRange` past the end, reflection on an unknown sort name. The client sent
   bad input; the server reports that *it* is broken.
4. **Sorting by reflection on a client string** makes every `Product` property
   publicly sortable, and **the response says nothing about the whole**.

## What changed in the refactor

- **Typed parameters validate first**: `int? page` means ASP.NET Core answers
  `?page=abc` with a 400 before our lambda runs (cs#17).
- **`PageRequest` states the policy: clamp what has an obvious intent, reject
  what doesn't.** `Normalize` cannot throw; `Validate` 400s an off-whitelist
  sort field, because guessing at `pirce` could silently return the wrong data.
  The whitelist is a `switch`, not a property lookup.
- **`Paginator.Slice<T>` is generic and tested at the boundaries**: page 1 skips
  nothing, the last page may be partial, past-the-end is empty, and `(long)`
  arithmetic stops `?page=2000000000` overflowing to a negative skip that
  quietly returns page one. It fills the envelope with totals and page counts.
- **A total order.** `ThenBy(p => p.Id)` after every sort makes pages *tile* the
  result set; without it two equal prices can swap between requests, so one
  product lands on two pages and another on none.

## Key takeaway

Every endpoint returning a list makes a promise about size, and if you don't
write it down the answer is "all of it, forever" — which works right up until
the table grows. Decide the shape at the door: parse into a typed request,
clamp the harmless, reject the ambiguous, keep the arithmetic in one tested
pure function. The off-by-one isn't the hard part; knowing where it is, is.
