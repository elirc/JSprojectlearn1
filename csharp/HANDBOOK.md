# 📘 The C# Handbook (for JS developers)

A reference for this repo's 28-project C#/.NET track. The projects teach one
concept at a time in build order; this file gathers them **by concept**, always
starting from what you already know in JavaScript. Snippets are marked `// ✅` /
`// ❌` where it matters, and **→ cs#18** points at the project that teaches the
idea properly. Everything here was run against the .NET SDK 10 that this track
targets — the printed outputs are real, not remembered. Offline throughout: no
NuGet packages, ever. Assumed: you know JavaScript; every C# term is defined at
first use.

**Contents** — 1 [Compiled vs interpreted](#1-compiled-vs-interpreted) · 2 [The type system](#2-the-type-system) · 3 [Syntax map](#3-syntax-map-js--c) · 4 [Collections](#4-collections) · 5 [LINQ](#5-linq-the-array-methods-you-already-know) · 6 [Properties & encapsulation](#6-properties-and-encapsulation) · 7 [Interfaces & generics](#7-interfaces-and-generics) · 8 [Delegates & events](#8-delegates-and-events) · 9 [Exceptions vs Result](#9-exceptions-vs-result) · 10 [async/await](#10-asyncawait-and-task) · 11 [ASP.NET Core](#11-aspnet-core-essentials) · 12 [Top 15 traps](#12-c-traps-top-15-for-js-developers)

## 1. Compiled vs interpreted

JavaScript ships source; the engine parses and runs it. C# ships **compiled** code:
`dotnet run` first hands your source to the compiler, which turns it into **IL**
(Intermediate Language) inside an assembly (`.dll`), and only then does the runtime
execute it — JIT-compiling IL to machine code as it goes. The practical consequence
is the one this whole track is built on: **a large class of mistakes becomes
impossible to run at all.** A misspelled property, a `string` where an `int` was
wanted, a missing `case` — in JS those are 3am pager events; in C# the program does
not start.

```
dotnet run csharp/01-hello-fizzbuzz/original.cs           # single-file app
dotnet run --project csharp/01-hello-fizzbuzz/refactored  # a real project
dotnet run --project csharp/01-hello-fizzbuzz/refactored -- test
```

Two other differences you'll feel immediately. **Errors stop the build; warnings
don't** — but a warning (like the nullable ones in section 2) is still the compiler
naming a real bug, so treat them as errors. And **everything lives in a type**:
there are no free-floating functions at file scope. Top-level statements (what
`original.cs` files use) are sugar — the compiler wraps them in a hidden `Main` —
which is why local functions must appear *before* any type declaration. **→ cs#05**

## 2. The type system

### Value types vs reference types — the whole ballgame

A **reference type** variable holds an *arrow* to an object; a **value type**
variable holds *the data itself*. `=` copies whatever the variable holds — the
arrow, or the data:

```csharp
class PointC { public int X; }          // class  = reference type
struct PointS { public int X; }         // struct = value type
var c1 = new PointC { X = 1 };
var c2 = c1;  c2.X = 99;
Console.WriteLine(c1.X);                // 99  — two names, ONE object (aliasing)
var s1 = new PointS { X = 1 };
var s2 = s1;  s2.X = 99;
Console.WriteLine(s1.X);                // 1   — s2 was a full copy
```

JavaScript has the same split — numbers and strings copy, objects share — but C#
lets you *define* which side a type is on. `int`, `bool`, `char`, `double`,
`decimal`, `DateTime`, and every `enum` are structs; that's why `int b = a;` never
surprised you. **→ cs#02**

### `class` vs `struct` vs `record`

| | `class` | `struct` | `record` |
|---|---|---|---|
| Copy on `=`? | no — shares | yes — full copy | no — shares (but immutable) |
| `==` compares | references | field-by-field | **values** |
| Default `ToString()` | type name | field dump | `Type { A = 1, B = x }` |
| Use it for | services, entities with identity | tiny value-ish data | **data** — DTOs, messages, money |

```csharp
record Money(decimal Amount, string Currency);
var a = new Money(10m, "USD");
var b = new Money(10m, "USD");
Console.WriteLine(a == b);                // True   — value equality!
Console.WriteLine(ReferenceEquals(a, b)); // False  — still two objects
Console.WriteLine(a);                     // Money { Amount = 10, Currency = USD }
var c = a with { Amount = 20m };          // C#'s { ...a, amount: 20 }, type-checked

class MoneyClass { public decimal Amount { get; set; } }   // a plain class:
var m1 = new MoneyClass { Amount = 10m };
var m2 = new MoneyClass { Amount = 10m };
Console.WriteLine(m1 == m2);              // False  — different arrows
Console.WriteLine(m1);                    // MoneyClass  (just the type name)
```

That one `record` line generates a constructor, read-only properties, value
equality, a readable `ToString`, and `with`; the class gets none of it. In JS you
always wished `{x:1} === {x:1}` were `true` — here it is. **Records are the
default choice for data**, and because they can't change, aliasing one is
harmless. **→ cs#07**

### Numbers: `int`, `double`, `decimal`

JavaScript has one number type. C# has many, and picking wrong is a real bug.
Rule of thumb: **money → `decimal`** (literals take an `m` suffix: `8.00m`),
**science/graphics → `double`**, **counting → `int`**. **→ cs#02, cs#07**

```csharp
Console.WriteLine(7 / 2);               // 3      — INTEGER division, not 3.5
Console.WriteLine(7 / 2.0);             // 3.5
Console.WriteLine(-7 / 2);              // -3     — truncates toward zero
Console.WriteLine(-7 % 2);              // -1     — sign follows the dividend
Console.WriteLine(0.1 + 0.2);           // 0.30000000000000004   (same as JS)
Console.WriteLine(0.1 + 0.2 == 0.3);    // False
Console.WriteLine(0.1m + 0.2m == 0.3m); // True   — decimal stores digits exactly
```

### Nullable reference types (NRT)

By default in modern C#, `string` means "a string, never null" and `string?`
means "a string or null." The compiler tracks flow and *warns* — these are
warnings, not errors, so they are easy to ignore and expensive to ignore.

```csharp
string? maybe = GetMaybe();
int len = maybe.Length;      // ⚠️ CS8602: Dereference of a possibly null reference
                             //    → and it really does throw NullReferenceException
if (maybe is not null) len = maybe.Length;      // ✅ narrowed, no warning
Console.WriteLine(maybe?.Length.ToString() ?? "null");   // ✅ null-conditional
Console.WriteLine(maybe ?? "fallback");                  // ✅ null-coalescing
maybe ??= "assigned only if null";                       // ✅ null-coalescing assign

// ❌ `?.` on a value — `maybe?.Length` is already int?, so a second ?. is an error
// Console.WriteLine(maybe?.Length?.ToString());   // CS0023: Operator '?' cannot be
                                                   // applied to operand of type 'int'
Console.WriteLine(maybe!.Length);   // `!` = "trust me" — silences the compiler,
                                    // still throws NullReferenceException

// Nullable VALUE types are a different mechanism: `int?` is Nullable<int>,
// a struct wrapping a value plus a HasValue flag.
int? n = null;
Console.WriteLine(n.HasValue);            // False
Console.WriteLine(n ?? -1);               // -1
Console.WriteLine(n.GetValueOrDefault()); // 0
var boom = n!.Value;                      // 💥 InvalidOperationException
                                          //    (NOT NullReferenceException)
```

`!` is the exact analogue of TypeScript's non-null assertion, with the same
verdict: it's a promise, not a check. **→ cs#05** (mirrors ts#05)

## 3. Syntax map: JS → C#

| JavaScript | C# | Note |
|---|---|---|
| `let x = 1` | `var x = 1;` or `int x = 1;` | `var` = "infer the type", still static |
| `const PI = 3.14` | `const double Pi = 3.14;` | compile-time constant |
| `const list = []` (rebind blocked) | `readonly List<int> _items = new();` | field can't be *reassigned*; contents can change |
| `===` / `!==` | `==` / `!=` | no coercion in C#, so one operator is enough |
| `x === y` on objects | `ReferenceEquals(x, y)` | `==` on records compares values |
| `x => x * 2` | `x => x * 2` | identical; it's called a **lambda** |
| `function f(a, b) {}` | `int F(int a, int b) { … }` | return type comes first |
| `` `hi ${name}` `` | `$"hi {name}"` | `$` = interpolated string |
| `` `${v.toFixed(2)}` `` | `$"{v:F2}"` or `$"{v:C}"` | format specifiers: F2, C (currency), N0 |
| `arr.filter(f)` / `arr.map(f)` | `arr.Where(f)` / `arr.Select(f)` | LINQ, section 5 |
| `arr.reduce(f, init)` | `arr.Aggregate(init, f)` | |
| `arr.find(f)` / `arr.includes(x)` | `arr.FirstOrDefault(f)` / `arr.Contains(x)` | |
| `[...a, ...b]` | `a.Concat(b)` | or collection expression `[..a, ..b]` |
| `{ ...obj, x: 1 }` | `obj with { X = 1 }` | records only |
| `obj?.prop ?? d` | `obj?.Prop ?? d` | same operators |
| `try/catch (e)` | `try/catch (Exception e)` | catch a *type* |
| `throw new Error('x')` | `throw new InvalidOperationException("x");` | pick a specific type |
| `class A { #p }` | `class A { private int _p; }` | `_camelCase` for private fields |
| `get value() {}` | `public int Value => …;` | a **property**, section 6 |
| `async/await` | `async/await` | `Promise<T>` → `Task<T>`, section 10 |
| `JSON.stringify` | `JsonSerializer.Serialize` | `System.Text.Json` |
| `console.log` | `Console.WriteLine` | |

Naming conventions carry meaning here: **PascalCase** for types, methods, and
properties; **camelCase** for parameters and locals; **`_camelCase`** for private
fields; interfaces start with `I`. Two syntax forms you'll see constantly — and
note that leaving out `_` on an *enum* switch expression is a **warning**, not an
error (`CS8524: The switch expression does not handle some values of its input
type`), which is C#'s version of the exhaustiveness check. **→ cs#01, cs#06**

```csharp
// Expression-bodied member: => is "return this one expression"
public decimal Total => Quantity * UnitPrice;

// Switch EXPRESSION (produces a value) vs switch statement (does things)
static string Describe(int n) => n switch
{
    < 0 => "negative",
    0 => "zero",
    > 0 and < 10 => "small",
    _ => "big",            // _ is the catch-all
};
// Describe(-1) Describe(0) Describe(5) Describe(50) → negative zero small big
```

## 4. Collections

```csharp
int[] fixedSize = new int[3];             // 0,0,0 — length is frozen
var list = new List<string> { "a", "b" }; // the everyday one, like a JS array
var map = new Dictionary<string, int> { ["b"] = 2, ["a"] = 1 };
var set = new HashSet<int> { 1, 2, 2, 3 };   // Count is 3 — duplicates dropped
```

| Need | Use | JS analogue |
|---|---|---|
| Ordered, growable, index access | `List<T>` | `Array` |
| Key → value lookup | `Dictionary<K,V>` | `Map` / object |
| Uniqueness, fast "have I seen this?" | `HashSet<T>` | `Set` |
| Fixed-size buffer, hot loops | `T[]` | `TypedArray`-ish |
| Hand out without letting callers mutate | `IReadOnlyList<T>` | (no equivalent) |

Behaviours that differ from JS and will bite. Mutating a collection while iterating
throws instead of misbehaving quietly; `List<T>.Sort()` mutates in place while
LINQ's `OrderBy` returns a new sequence and leaves the original alone — the js#26
lesson, restated. **→ cs#03, cs#13**

```csharp
var d = new Dictionary<string, int> { ["b"] = 2, ["a"] = 1 };
Console.WriteLine(string.Join(",", d.Keys));   // b,a — insertion order, NOT sorted
var missing = d["z"];                          // 💥 KeyNotFoundException (JS: undefined)
Console.WriteLine(d.TryGetValue("z", out var v));  // False, and v is 0 — the safe read
d["a"] = 10;                                   // indexer: add-or-update, never throws
d.Add("a", 5);                                 // 💥 ArgumentException — Add means ADD
Console.WriteLine(new HashSet<int> { 1, 2, 3 }.Add(3));   // False — already present

var l = new List<int> { 1, 2, 3 };
foreach (var n in l) { if (n == 1) l.Add(9); }   // 💥 InvalidOperationException
var xs = new List<int> { 3, 1, 2 };
var sorted = xs.OrderBy(x => x).ToList();
Console.WriteLine($"{string.Join(",", xs)} | {string.Join(",", sorted)}");
// 3,1,2 | 1,2,3        ← OrderBy did not touch xs
xs.Sort();                                     // now xs itself is 1,2,3
```

## 5. LINQ: the array methods you already know

**LINQ** (Language Integrated Query) is the standard library of sequence
operations — it works on anything enumerable and reads like a pipeline.

```csharp
var words = new List<string> { "apple", "fig", "banana", "date", "kiwi" };
words.Where(w => w.Length > 4)              // filter        → apple, banana
words.Select(w => w.ToUpper())              // map           → APPLE, FIG, …
words.Aggregate(0, (acc, w) => acc + w.Length)  // reduce     → 22
words.Sum(w => w.Length)                    // (nicer than Aggregate here) → 22
words.OrderBy(w => w.Length).ThenBy(w => w) // sort by, then by
                                            // → fig, date, kiwi, apple, banana
words.FirstOrDefault(w => w.StartsWith('z'))// find          → null
words.Any(w => w.Length > 5)                // some          → True
words.All(w => w.Length > 2)                // every         → True
words.Take(2)  words.Skip(3)                // slice          → apple,fig | date,kiwi
words.SelectMany(w => w.Take(2))            // flatMap       → a,p,f,i,b,a,…
words.Count()  words.Min()  words.Max()     // aggregates
words.Distinct()  words.Reverse()
words.ToList()  words.ToArray()  words.ToDictionary(w => w[0], w => w.Length)
```

`GroupBy` has no clean JS equivalent and is worth learning properly — each group
*is* a sequence, with a `.Key`. This is the whole of cs#04 and most of the
reporting endpoints in cs#26.

```csharp
var grouped = words.GroupBy(w => w.Length).OrderBy(g => g.Key)
                   .Select(g => $"{g.Key}:[{string.Join("|", g)}]");
Console.WriteLine(string.Join(" ", grouped));
// 3:[fig] 4:[date|kiwi] 5:[apple] 6:[banana]
```

### Deferred execution — the big one

A LINQ query is a **recipe, not a result**: nothing runs until you enumerate
(`foreach`, `ToList`, `Count`, `Sum`, …), and a query enumerated twice does all
its work twice.

```csharp
var source = new List<int> { 1, 2, 3 };
var query = source.Where(n => n > 1);
source.Add(4);
Console.WriteLine(string.Join(",", query));    // 2,3,4  ← sees the LATE addition
var snapshot = source.Where(n => n > 1).ToList();
source.Add(5);
Console.WriteLine(string.Join(",", snapshot)); // 2,3,4  ← frozen at ToList()
var lazy = Enumerable.Range(1, 3).Select(n => { Console.WriteLine($"computing {n}"); return n; });
var sum = lazy.Sum();
var max = lazy.Max();
// prints "computing 1..3" TWICE — six lines, not three
```

Rule: **`ToList()` at the boundary** — keep queries lazy inside a pipeline and
materialise once when handing the result on. Empty-sequence behaviour is worth
knowing too, and every LINQ operator is an **extension method** (a static method
whose first parameter is marked `this`) — how you add fluent helpers to types you
don't own. **→ cs#04, cs#13**

```csharp
var empty = new List<int>();
empty.FirstOrDefault()   // 0     — the type's default, NOT null, for value types
empty.First()            // 💥 InvalidOperationException: Sequence contains no elements
empty.Sum()              // 0     — fine
empty.Max()              // 💥 InvalidOperationException

static class Ext
{
    public static string Titleize(this string s) =>          // note `this string s`
        string.Join(" ", s.Split(' ').Select(w => char.ToUpper(w[0]) + w[1..]));
}
"hello world".Titleize();   // "Hello World"
```

## 6. Properties and encapsulation

A **property** looks like a field to callers but is really a get/set pair — C#'s
version of a JS `get`/`set` accessor, minus the boilerplate.

```csharp
public class Account
{
    public decimal Balance { get; private set; }   // read anywhere, write only inside
    public string Formatted => $"{Balance:C}";     // computed, read-only ($100.00)
    public Account(decimal opening) => Balance = opening;
    public void Withdraw(decimal amount)           // the ONLY path that changes it
    {
        if (amount > Balance) throw new InvalidOperationException("Insufficient funds");
        Balance -= amount;
    }
}
```

The point is the **invariant**: "balance never goes negative" is enforced in one
place instead of hoped for at every call site — a `public decimal Balance;` field
would let any code set it to `-5000`. The vocabulary: `{ get; set; }`
(auto-property), `{ get; init; }` (settable only in an object initializer, then
frozen), `{ get; private set; }` (as above), `=> expr` (computed on every read).
Access modifiers: `public`, `private` (the default), `protected`, `internal`
(assembly-only). **→ cs#02, cs#09**

```csharp
private readonly List<Order> _lines = new();
public IReadOnlyList<Order> Lines => _lines;   // indexing + Count, no Add/Remove
```

Expose collections as `IReadOnlyList<T>` so callers can look but not touch. Note
`readonly` blocks *reassignment of the field*, not mutation of the object it
points at — `_lines.Add(x)` is still legal inside the class, exactly the JS
`const arr = []` situation.

## 7. Interfaces and generics

An **interface** is a contract: a list of members with no implementation. Code
depending on the interface works with any implementation — the "switch-on-string
becomes a plug-in" move.

```csharp
public interface ICipher { string Name { get; } string Encode(string s); }
public class Rot13 : ICipher { public string Name => "rot13"; /* … */ }
public class Reverse : ICipher { public string Name => "reverse"; /* … */ }
foreach (ICipher c in new List<ICipher> { new Rot13(), new Reverse() })
    Console.WriteLine($"{c.Name} -> {c.Encode("abc")}");
// rot13 -> nop   /   reverse -> cba
```

Adding a cipher means adding a class — no existing file changes, no `switch` to
forget: the same design pressure as TypeScript's discriminated unions, applied
through polymorphism. **Generics** are C#'s type parameters, with the same job as
TypeScript's — relate input types to output types instead of erasing them to
`object` — and **constraints** with `where` are the analogue of `extends`.
**→ cs#10, cs#11**

```csharp
public class Box<T>(T value)                     // primary constructor
{
    public T Get() => value;
    public Box<U> Map<U>(Func<T, U> f) => new Box<U>(f(value));
}
new Box<string>("hi").Map(s => s.Length).Get();  // 2, typed as int throughout
public class LruCache<TKey, TValue> { /* … */ }  // two parameters, correlated
static T Max<T>(T a, T b) where T : IComparable<T> => a.CompareTo(b) >= 0 ? a : b;
Max(3, 7);        // 7
Max("a", "b");    // b
```

Common constraints: `where T : class` (reference type), `where T : struct` (value
type), `where T : new()` (has a parameterless constructor), `where T : ISomething`.
The pre-generics alternative — storing `object` and casting on the way out — is
what cs#11 exists to show you the cost of. **→ cs#11**

## 8. Delegates and events

A **delegate** is a typed function reference — the type of a function, spelled
out. `Action<T>` returns nothing; `Func<T, TResult>` returns something;
`Predicate<T>` is `Func<T, bool>`.

```csharp
Action<string> log = m => Console.WriteLine(m);
Func<int, int> dbl = x => x * 2;
Console.WriteLine(dbl(21));           // 42
log += m => Console.WriteLine($"also: {m}");   // MULTICAST — both run, in order
log("hi");                                     // hi / also: hi
```

An **event** is a delegate with the dangerous parts removed: outsiders may `+=`
(subscribe) and `-=` (unsubscribe) but cannot fire it or clear the list — the
observer pattern, built into the language.

```csharp
public class Publisher
{
    public event EventHandler<string>? Fired;         // ? — may have no subscribers
    public void Fire(string payload) => Fired?.Invoke(this, payload);
}
var pub = new Publisher();
pub.Fired += (sender, e) => Console.WriteLine($"handler1 {e}");
pub.Fired += (sender, e) => Console.WriteLine($"handler2 {e}");
pub.Fire("payload");            // handler1 payload / handler2 payload
new Publisher().Fire("nobody listening");   // no crash — `?.Invoke` handles it
```

The `?.Invoke` is not optional politeness: a plain `Fired(this, x)` with zero
subscribers throws `NullReferenceException`. And every `+=` you never `-=` is a
memory leak — the publisher now holds a reference to the subscriber, the C#
version of "forgot to `removeEventListener`". **→ cs#12**

## 9. Exceptions vs Result

C# has real exceptions and uses them properly: **exceptional** means "the caller
could not reasonably have prevented this." Useful built-ins: `ArgumentException` /
`ArgumentNullException` (bad input), `InvalidOperationException` (bad state),
`KeyNotFoundException`, `FormatException`, `NotSupportedException` — prefer these
to a bare `Exception`.

```csharp
try { account.Withdraw(500m); }
catch (InvalidOperationException e) { Console.WriteLine(e.Message); }  // by TYPE
catch (Exception e) when (e is not OutOfMemoryException)               // filter
{
    throw;                               // `throw;` rethrows and KEEPS the stack trace
}                                        // `throw e;` would reset it — a real bug
finally { /* always runs */ }
```

But **expected** failures — a validation miss, a parse that didn't work, a lookup
that came up empty — aren't exceptional, and hiding them in exceptions makes them
invisible in the signature. Model them as values instead, exactly as the
TypeScript track does. The `TryXxx` pattern below is C#'s own answer to the same
problem and it is everywhere (`int.TryParse`, `dict.TryGetValue`,
`queue.TryDequeue`): returns `bool`, hands the value back through `out`.
**→ cs#08** (mirrors ts#36)

```csharp
abstract record Result;
record Ok(int Value) : Result;
record Err(string Message) : Result;

static Result Parse(string s) =>
    int.TryParse(s, out var n) ? new Ok(n) : new Err($"'{s}' is not a number");
static string Describe(Result r) => r switch
{
    Ok o => $"ok {o.Value}",
    Err e => $"err {e.Message}",
    _ => "?",
};
Describe(Parse("12"));   // ok 12
Describe(Parse("xx"));   // err 'xx' is not a number
```

## 10. async/await and Task

`Task` is C#'s `Promise`, `Task<T>` is `Promise<T>`, and `async`/`await` read the
same. The differences that matter:

| JavaScript | C# |
|---|---|
| `Promise<T>` | `Task<T>` |
| `Promise<void>` | `Task` |
| `Promise.all([a, b])` | `Task.WhenAll(a, b)` |
| `Promise.race([a, b])` | `Task.WhenAny(a, b)` |
| `Promise.resolve(v)` | `Task.FromResult(v)` |
| `await sleep(100)` | `await Task.Delay(100)` |
| `AbortController` / `signal` | `CancellationTokenSource` / `CancellationToken` |

```csharp
static async Task<int> ValueAsync(int n) { await Task.Delay(10); return n * 10; }
var results = await Task.WhenAll(ValueAsync(1), ValueAsync(2));
Console.WriteLine(string.Join(",", results));   // 10,20
```

Sequential `await`s run one after another; `Task.WhenAll` starts them all and
waits for the set — the same choice as `for (const x of xs) await f(x)` versus
`await Promise.all(xs.map(f))`. **Never block on a Task:** `.Result` and
`.Wait()` are "sync over async" — they freeze a thread, can deadlock, and wrap
any exception in an `AggregateException` so your specific `catch` misses it.

```csharp
try { await Boom(); }
catch (InvalidOperationException e) { Console.WriteLine($"caught {e.Message}"); }
// caught boom                                    ✅ the exception you expected
try { Boom().Wait(); }
catch (AggregateException e) { Console.WriteLine(e.InnerException?.GetType().Name); }
// InvalidOperationException wrapped inside AggregateException     ❌ awkward

// Cancellation is COOPERATIVE — a token is passed down and checked, nothing is
// forcibly killed. In ASP.NET Core an endpoint can just take a CancellationToken
// parameter and the framework supplies one tied to the client disconnecting.
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
await LongJobAsync(cts.Token);          // throws OperationCanceledException on timeout
static async Task LongJobAsync(CancellationToken ct)
{
    for (var i = 0; i < 100; i++)
    {
        ct.ThrowIfCancellationRequested();
        await Task.Delay(50, ct);
    }
}
```

**Async all the way up.** If a method awaits, it is `async Task`; its callers
await it too, up to the entry point (`Main` and ASP.NET Core handlers can both be
`async`). Convention: name them `DoThingAsync`. **→ cs#14**

## 11. ASP.NET Core essentials

### Minimal APIs

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<ITodoRepo, InMemoryTodoRepo>();   // register services
var app = builder.Build();
var todos = app.MapGroup("/todos");        // state the prefix once
todos.MapGet("/", (ITodoRepo repo) => repo.All());
todos.MapGet("/{id:int}", (int id, ITodoRepo repo) =>
    repo.Find(id) is Todo t ? Results.Ok(t) : Results.NotFound());
todos.MapPost("/", (CreateTodo dto, ITodoRepo repo) => { /* … */ });
todos.MapDelete("/{id:int}", (int id, ITodoRepo repo) =>
    repo.Remove(id) ? Results.NoContent() : Results.NotFound());
app.Run("http://localhost:5015");

// Model binding fills parameters from the request automatically:
app.MapGet("/search", (string? q, int page = 1) => new SearchEcho(q, page));
// GET /search?q=a&page=3  →  200  {"q":"a","page":3}
// GET /search             →  200  {"q":null,"page":1}     defaults apply
```

`is Todo t ? … : …` is **pattern matching**: "if this isn't null, bind it to
`t`," replacing the `if (x == null) return …;` dance. Endpoints should be one line
of translation — HTTP in, service call, HTTP out — with the decisions in a
testable service. **→ cs#15, cs#16**

### Model binding

Route parameters (`{id}`) come from the path, simple types from the query string,
and a complex type (like `CreateTodo`) from the JSON body. JSON is camelCased both
ways by default, so C#'s `Title` is the wire's `title`. Route **constraints**
filter before binding: with `/{id:int}`, a request to `/todos/abc` simply doesn't
match that route (you get **404**, not 400), while a body that can't deserialise
gives **400** automatically. **→ cs#17**

### Status-code results

| Helper | Code | Use for |
|---|---|---|
| `Results.Ok(x)` | 200 | successful read |
| `Results.Created($"/todos/{id}", x)` | 201 | after POST, with a `Location` header |
| `Results.NoContent()` | 204 | successful DELETE/PUT with nothing to say |
| `Results.BadRequest(x)` / `Results.NotFound()` | 400 / 404 | bad input; missing resource |
| `Results.ValidationProblem(errors)` | 400 | field-level validation, ProblemDetails shape |
| `Results.Problem(...)` | 500 | unexpected failure |

**ProblemDetails** is the standard machine-readable error body; returning it
consistently (ideally from one exception-handling middleware) means clients never
have to guess your error shape. **→ cs#16, cs#17, cs#20**

```csharp
Results.ValidationProblem(new Dictionary<string, string[]> { ["title"] = ["Title is required."] });
// 400 {"type":"…rfc9110…","title":"One or more validation errors occurred.",
//      "status":400,"errors":{"title":["Title is required."]}}
```

### Dependency injection and lifetimes

A class *declares* what it needs as constructor parameters typed as interfaces,
and the **container** supplies them — production gets real implementations, tests
get fakes, and nothing reaches for a global.

```csharp
builder.Services.AddSingleton<IClock, SystemClock>();   // interface → implementation
builder.Services.AddScoped<TodoService>();              // concrete class
builder.Services.AddTransient<IEmailSender, SmtpSender>();
app.MapGet("/todos", (TodoService svc) => svc.All());   // just declare the need
```

| Lifetime | One instance per… | Coffee-shop version | Use for |
|---|---|---|---|
| `AddSingleton` | the whole app | the espresso machine | shared state, stateless helpers |
| `AddScoped` | HTTP request | your cup | per-request work, DB contexts |
| `AddTransient` | every injection | a napkin | cheap, stateless things |

Verified behaviour: hit an endpoint twice and a singleton's counter goes 1 → 2; a
scoped service has a different id per request; asking for a transient *twice in one
request* gives two different instances. The one hard rule: **a singleton must never
capture a scoped service** (the espresso machine can't keep your cup) — the
container throws if you try. **→ cs#18, cs#21**

### The middleware pipeline

Middleware are stations on an assembly line: a request flows *down* through them
to the endpoint, the response flows back *up*. **Order is the behaviour.**

```csharp
app.Use(async (ctx, next) =>
{
    Console.WriteLine($"--> {ctx.Request.Method} {ctx.Request.Path}");
    await next(ctx);                                     // continue down the pipeline
    Console.WriteLine($"<-- {ctx.Response.StatusCode}");  // runs on the way back up
});
app.UseWhen(ctx => ctx.Request.Path.StartsWithSegments("/admin"),   // branch
    admin => admin.Use(async (ctx, next) =>
    {
        if (!IsValidKey(ctx.Request.Headers["X-Api-Key"]))
        {
            ctx.Response.StatusCode = 401;
            return;                       // short-circuit: the endpoint never runs
        }
        await next(ctx);
    }));
```

Not calling `next` short-circuits — exactly how auth gates and caches work.
Response *headers* must be set before the body starts streaming, so for a value
computed later (elapsed time, say) register `ctx.Response.OnStarting(...)`. Typical
order: exception handler → logging → static files → CORS → auth → endpoints.
**→ cs#19, cs#20**

### Configuration and options

`CreateBuilder` stacks configuration layers for you — `appsettings.json`, then
environment variables (`Notifier__RetryCount=7`), then command line
(`--Notifier:RetryCount=7`) — with later layers winning. Bind a section to a record
and inject it as `IOptions<T>`. Validate at startup so a bad setting stops the app
*there*, naming the setting, rather than at 2am mid-request — and never put a
secret in `appsettings.json`, which is committed. **→ cs#22**

```csharp
builder.Services.Configure<NotifierOptions>(builder.Configuration.GetSection("Notifier"));
app.MapGet("/status", (IOptions<NotifierOptions> opt) => Results.Ok(opt.Value));
```

### Static files, CORS, and the frontend

Put the browser's files in `wwwroot/` and the data under `/api/` — no HTML is ever
built by string concatenation in C#. **CORS** is a *browser* rule: it decides
whether a page from origin A may read a response from origin B. Serving the page
and the API from the same origin needs no CORS policy at all; you only need one
when the frontend runs on its own dev server. `curl` never cared. **→ cs#24, cs#25**

```csharp
builder.Services.AddCors(o => o.AddPolicy("frontend", p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
var app = builder.Build();
app.UseDefaultFiles();    // "/" → wwwroot/index.html
app.UseStaticFiles();     // serve wwwroot/* verbatim
app.UseCors("frontend");
app.MapGet("/api/quotes", (QuoteService svc) => Results.Ok(svc.GetAll()));
```

## 12. C# traps: top 15 for JS developers

1. **`/` on two ints is integer division.** `7 / 2` is `3`, and `total / count`
   silently truncates. Make one side a `double` (or `decimal`) first. → cs#01
2. **`double` is not for money.** `0.1 + 0.2 != 0.3` here just like in JS. Use
   `decimal` (`8.00m`) for anything with a currency symbol. → cs#02, cs#07
3. **`==` on classes compares references.** Two objects with identical contents
   are not equal. Records compare by value; strings do too (a special case in
   the language, not a general rule). → cs#02, cs#07
4. **`=` on a class copies the arrow, not the object** — the JS aliasing bug,
   unchanged. Copy with `new List<T>(other)` or `record` + `with`. → cs#02
5. **Structs copy, so mutating one out of a `List` does nothing.**
   `var p = list[0]; p.X = 99;` leaves the list untouched (an array *does* allow
   `arr[0].X = 99`). This is why mutable structs are a bad idea. → cs#02
6. **LINQ is deferred.** A query captures the source and re-runs on every
   enumeration, so later mutations show up and side effects fire twice. Call
   `ToList()` at the boundary. → cs#04
7. **`dict["missing"]` throws** `KeyNotFoundException` where JS gives you
   `undefined`. Use `TryGetValue`. → cs#03
8. **`First()` on an empty sequence throws; `FirstOrDefault()` returns the type's
   *default*** — `0` for `int`, not null. Same for `Max()`/`Sum()`. → cs#04
9. **Nullable warnings are only warnings.** `string? s; s.Length;` compiles,
   warns CS8602, and throws at runtime. Treat CS86xx as errors. → cs#05
10. **`!` is a lie, not a check** — and on an `int?`, `.Value` throws
    `InvalidOperationException`, not `NullReferenceException`. → cs#05
11. **`.Result` / `.Wait()` are sync-over-async.** They block a thread, can
    deadlock, and wrap exceptions in `AggregateException`. → cs#14
12. **A `for` loop variable is shared by closures.** Capturing `i` inside
    `for (int i = 0; …)` gives `3,3,3` — the JS `var` bug. `foreach` captures per
    iteration and gives `0,1,2`. → cs#12
13. **`OrderBy` returns a new sequence; `List.Sort()` mutates.** The wrong one
    silently reorders somebody else's data. → cs#03, cs#13
14. **Strings are immutable.** `s.ToUpper();` on its own line does nothing — use
    the return value, and use `StringBuilder` in loops. → cs#01
15. **Firing an event with no subscribers throws.** Always `Fired?.Invoke(…)`, and
    every `+=` without a matching `-=` keeps the subscriber alive. → cs#12

## The one big idea, restated

The compiler is your first test suite and the DI container is your seam. Push
decisions into small, pure, interface-shaped services that a test can construct in
one line; keep endpoints, event handlers, and `Main` as thin translation layers
that decide nothing. Everything in this track is a variation on that.
