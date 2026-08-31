# C# / .NET track — 36 projects

Same method as the JS track: every folder has a **working but flawed** original,
a `refactored/` version, a `README.md` explaining what changed and why, and a
beginner `LEARN.md` that teaches the concepts from scratch. The goal: upskill
from JS/TS into **C# and ASP.NET Core fullstack web development**.

## Setup

You need the .NET SDK 10 (check with `dotnet --version`). Everything runs
**offline** — no NuGet packages are ever downloaded:

- `original.cs` files are single-file apps: `dotnet run csharp/01-hello-fizzbuzz/original.cs`
- `refactored/` folders are real projects: `dotnet run --project csharp/01-hello-fizzbuzz/refactored`
- Tests are built in: `dotnet run --project csharp/01-hello-fizzbuzz/refactored -- test`

Real projects use xUnit (a NuGet test framework); this track hand-rolls a tiny
`Check` helper instead (the same idea as js#45's mini test framework) so tests
run with zero setup and no internet.

## The curriculum

### C# fundamentals (01–08)
| # | Project | Lesson |
|---|---------|--------|
| 01 | hello-fizzbuzz | C# syntax landing; separate computing from printing (js#01 in C#) |
| 02 | value-vs-reference | Classes are references: the aliasing bug, and records/copies that fix it |
| 03 | collections-choice | Arrays + index loops vs `List`, `Dictionary`, `HashSet` (js#02 in C#) |
| 04 | linq-pipeline | Nested `foreach` + temp lists vs LINQ `Where/Select/GroupBy` (js#36 lite) |
| 05 | null-safety-csharp | `NullReferenceException` minefield vs nullable reference types (ts#05 in C#) |
| 06 | enums-and-switch | Magic strings vs enums + exhaustive switch expressions (ts#06/#12 in C#) |
| 07 | records-immutability | Mutable money objects vs records, `with`, init-only (js#32 in C#) |
| 08 | exceptions-vs-result | Exceptions as control flow vs a `Result` type (ts#36 in C#) |

### OOP & design (09–14)
| # | Project | Lesson |
|---|---------|--------|
| 09 | encapsulation-bank | Public fields vs properties + invariants (js#29 in C#) |
| 10 | interfaces-plugins | Switch-on-string vs `ICipher` interface plug-ins (js#13 in C#) |
| 11 | generics-lru | `object` + casts vs `LruCache<TKey,TValue>` (js#41/ts#41 in C#) |
| 12 | events-delegates | Hand-rolled observer lists vs delegates and `event` (js#38 in C#) |
| 13 | extension-linq-utils | Utility-class grab bag vs extension methods + fluent chains (js#26) |
| 14 | async-await-basics | `.Result` sync-over-async vs `async/await`, `Task.WhenAll`, cancellation (js#42/43) |

### ASP.NET Core web (15–24)
| # | Project | Lesson |
|---|---------|--------|
| 15 | minimal-api-todo | One giant Program.cs vs organized minimal API endpoints (js#65 in C#) |
| 16 | rest-conventions | RPC-style routes vs REST resources, verbs, and status codes |
| 17 | model-binding-validation | Manual parsing vs typed DTOs + validation responses |
| 18 | dependency-injection | Statics and `new` everywhere vs the DI container and lifetimes |
| 19 | middleware-pipeline | Copy-pasted cross-cutting code vs custom middleware |
| 20 | error-handling-problemdetails | try/catch per endpoint vs exception middleware + ProblemDetails |
| 21 | json-file-repository | File I/O inside endpoints vs a repository interface + fake for tests (js#55) |
| 22 | config-and-options | Hard-coded settings vs appsettings.json + typed `IOptions` |
| 23 | auth-password-hashing | Plaintext passwords vs PBKDF2 hashing + cookie auth basics (js#66 in C#) |
| 24 | cors-and-static-files | Server-built HTML strings vs `wwwroot` static files + CORS for fetch |

### Fullstack capstones (25–28)
| # | Project | Lesson |
|---|---------|--------|
| 25 | fullstack-todo | C# API + JS `fetch` frontend, end to end (js#14 + js#65 combined) |
| 26 | fullstack-expense-tracker | Aggregation endpoints with LINQ + summary frontend (js#63 in C#) |
| 27 | websocket-chat-dotnet | WebSockets in ASP.NET Core: accept, broadcast, disconnect (js#67) |
| 28 | capstone-kanban-api | Everything combined: records, validation, DI, repository, tests (js#64) |

### Extended set: production skills (29–36)
| # | Project | Lesson |
|---|---------|--------|
| 29 | linq-deep-dive | Deferred execution traps: the query that ran five times |
| 30 | iterators-yield | Eager lists vs `yield return` lazy sequences |
| 31 | pattern-matching-rules | Nested if/else rules vs switch expressions with patterns |
| 32 | background-work-queue | Fire-and-forget `Task.Run` vs `Channel<T>` + a hosted worker |
| 33 | caching-memory | Recompute-per-request vs `IMemoryCache` with real invalidation |
| 34 | pagination-filtering | Returning all 10,000 rows vs a validated page envelope |
| 35 | integration-testing | In-process HTTP tests against a real Kestrel server — no mocks |
| 36 | fullstack-auth-notes | The track capstone: sessions + per-user data + frontend, composed |

Each project also has `LEARN.md` and `PRACTICE.md`; this folder has
`HANDBOOK.md` and `QUIZ.md` too.

## How this track connects to the others

The lessons are deliberately the *same lessons* as the JS/TS tracks, re-learned
in a statically-typed, compiled language with a batteries-included web
framework. When a project mirrors an earlier one (noted in each table row),
skim that project's README first — recognizing the shape in a new language is
the fastest way to learn both.

## The one big idea, again

Good code is code that's easy to change. In C# the compiler is your first
test suite (like TypeScript), and ASP.NET Core's dependency injection is the
"separate deciding from doing" move (pure, testable services behind
interfaces; thin endpoints that only translate HTTP).
