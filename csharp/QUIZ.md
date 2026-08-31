# 📝 C# Quiz Bank — 50 questions

Fifty questions over the whole C#/.NET track, written for someone arriving from
JavaScript. Answers are at the bottom with a one-to-three-sentence explanation
and a pointer to the project that teaches the idea (**→ cs#14** and so on).
Companion reference: `HANDBOOK.md`.

Difficulty: ⭐ warm-up · ⭐⭐ needs a moment · ⭐⭐⭐ genuinely tricky.

**Rules of the house.** Every snippet was actually compiled and run on the .NET
SDK 10 this track targets — the outputs below are copied from real runs, not
remembered. Nullable reference types are enabled, as in the track's projects.
Assume `using System; using System.Collections.Generic; using System.Linq;`.

How to use it: cover the answers, work a block, then check. If you miss one, go
do (or redo) the project it points at — the questions were written backwards
from the projects, not the other way round.

## Part 1 — What does this print? (Q1–Q20)

**Q1** ⭐
```csharp
Console.WriteLine($"{10 / 4} {10 / 4.0} {10 % 4}");
```

**Q2** ⭐
```csharp
Console.WriteLine($"{0.1 + 0.2 == 0.3} {0.1m + 0.2m == 0.3m}");
```

**Q3** ⭐⭐
```csharp
var a = "hello";
var b = "hel" + "lo";
Console.WriteLine($"{a == b} {ReferenceEquals(a, string.Concat("hel", "lo"))}");
```

**Q4** ⭐⭐
```csharp
class PointClass { public int X; }
struct PointStruct { public int X; }

var p1 = new PointClass { X = 1 };  var p2 = p1;  p2.X = 99;
var v1 = new PointStruct { X = 1 }; var v2 = v1;  v2.X = 99;
Console.WriteLine($"{p1.X} {v1.X}");
```

**Q5** ⭐⭐
```csharp
record Money(decimal Amount, string Currency);

var a = new Money(10m, "USD");
var b = new Money(10m, "USD");
Console.WriteLine($"{a == b} {ReferenceEquals(a, b)} {a}");
```

**Q6** ⭐⭐
```csharp
class Cart { public decimal Total { get; set; } }

var a = new Cart { Total = 10m };
var b = new Cart { Total = 10m };
Console.WriteLine($"{a == b} {a.Equals(b)}");
```

**Q7** ⭐⭐⭐
```csharp
var source = new List<int> { 1, 2, 3 };
var query = source.Where(n => n > 1);
source.Add(4);
Console.WriteLine(string.Join(",", query));
```

**Q8** ⭐⭐
```csharp
var source = new List<int> { 1, 2, 3 };
var snapshot = source.Where(n => n > 1).ToList();
source.Add(4);
Console.WriteLine(string.Join(",", snapshot));
```

**Q9** ⭐⭐⭐
```csharp
struct Pt { public int X; }

var list = new List<Pt> { new Pt { X = 1 } };
var copy = list[0];  copy.X = 99;
var arr = new Pt[] { new Pt { X = 1 } };
arr[0].X = 99;
Console.WriteLine($"{list[0].X} {arr[0].X}");
```

**Q10** ⭐⭐⭐
```csharp
var fromFor = new List<Func<int>>();
for (int i = 0; i < 3; i++) fromFor.Add(() => i);

var fromForeach = new List<Func<int>>();
foreach (var n in new[] { 0, 1, 2 }) fromForeach.Add(() => n);

Console.WriteLine($"[{string.Join(",", fromFor.Select(f => f()))}] " +
                  $"[{string.Join(",", fromForeach.Select(f => f()))}]");
```

**Q11** ⭐⭐
```csharp
var xs = new List<int> { 3, 1, 2 };
var ordered = xs.OrderBy(x => x).ToList();
Console.WriteLine($"{string.Join(",", xs)} | {string.Join(",", ordered)}");
```

**Q12** ⭐⭐
```csharp
var d = new Dictionary<string, int> { ["b"] = 2, ["a"] = 1 };
d["c"] = 3;
Console.WriteLine($"{string.Join(",", d.Keys)} {d.TryGetValue("z", out var got)} {got}");
```

**Q13** ⭐⭐
```csharp
var empty = new List<int>();
Console.WriteLine($"{empty.FirstOrDefault()} {empty.Sum()} {empty.Count}");
```

**Q14** ⭐
```csharp
var s = "abc";
s.ToUpper();
s.Replace("a", "z");
Console.WriteLine($"{s} {s.ToUpper()}");
```

**Q15** ⭐⭐
```csharp
string? n = null;
Console.WriteLine($"[{n ?? "fallback"}] [{n?.Length.ToString() ?? "null"}] [{"" ?? "x"}]");
```

**Q16** ⭐⭐
```csharp
int? i = null;
Console.WriteLine($"{i.HasValue} {i ?? -1} {i.GetValueOrDefault()}");
```

**Q17** ⭐⭐
```csharp
Console.WriteLine($"[{default(int)}] [{default(bool)}] [{(default(string) is null ? "null" : "?")}]");
```

**Q18** ⭐⭐⭐
```csharp
object a = 5, b = 5;
Console.WriteLine($"{a == b} {a.Equals(b)} {5 == 5}");
```

**Q19** ⭐
```csharp
static string Grade(int n) => n switch
{
    < 0 => "neg",
    0 => "zero",
    > 0 and < 10 => "small",
    _ => "big",
};
Console.WriteLine($"{Grade(-5)} {Grade(0)} {Grade(7)} {Grade(70)}");
```

**Q20** ⭐⭐
```csharp
var set = new HashSet<string> { "a", "b", "a" };
Console.WriteLine($"{set.Count} {set.Add("b")} {set.Add("c")}");
```

## Part 2 — Spot the bug (Q21–Q35)

Each of these compiles and runs. Say what goes wrong, and why.

**Q21** ⭐⭐⭐
```csharp
int calls = 0;
var query = new[] { 1, 2, 3 }.Select(n => { calls++; return n; });
var count = query.Count();
var sum = query.Sum();
Console.WriteLine(calls);      // the author expected 3
```

**Q22** ⭐⭐⭐
```csharp
static async Task SaveAsync() { await Task.Delay(1); throw new InvalidOperationException("boom"); }

try { SaveAsync().Wait(); }
catch (InvalidOperationException e) { Console.WriteLine($"handled: {e.Message}"); }
```

**Q23** ⭐⭐
```csharp
var listA = new List<int> { 1, 2 };
var listB = listA;          // "a backup, in case we need to undo"
listB.Add(3);
Console.WriteLine(listA.Count);
```

**Q24** ⭐⭐
```csharp
class Basket
{
    public List<string> Items { get; } = new();
    public void Add(string s) { if (s.Length > 0) Items.Add(s); }   // the invariant
}

var b = new Basket();
b.Items.Add("");            // straight past the check
```

**Q25** ⭐⭐
```csharp
var totals = new Dictionary<string, decimal>();
foreach (var order in orders)
    totals[order.Customer] = totals[order.Customer] + order.Amount;
```

**Q26** ⭐⭐
```csharp
var items = new List<int> { 1, 2, 3 };
foreach (var n in items)
    if (n % 2 == 1) items.Remove(n);
```

**Q27** ⭐⭐
```csharp
static decimal Average(List<int> scores) => scores.Sum() / scores.Count;
Console.WriteLine(Average(new List<int> { 7, 8 }));    // expected 7.5
```

**Q28** ⭐⭐
```csharp
class Order { public double Price { get; set; } }
var total = 0.0;
for (var i = 0; i < 10; i++) total += 0.1;
Console.WriteLine(total == 1.0);
```

**Q29** ⭐⭐
```csharp
static string FirstAdmin(List<User> users) => users.First(u => u.IsAdmin).Name;
// called with a list that has no admins
```

**Q30** ⭐⭐⭐
```csharp
class Cache
{
    public event EventHandler<string>? Evicted;
    public void Evict(string key) => Evicted(this, key);
}
new Cache().Evict("k1");
```

**Q31** ⭐⭐
```csharp
string? name = FindName(id);
Console.WriteLine(name!.ToUpper());     // "it's always there in practice"
```

**Q32** ⭐⭐⭐
```csharp
builder.Services.AddSingleton<ReportService>();     // holds no state
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
// ReportService's constructor takes an IUnitOfWork
```

**Q33** ⭐⭐
```csharp
static IEnumerable<Row> LoadRows(string path)
{
    using var reader = new StreamReader(path);
    while (reader.ReadLine() is string line) yield return Parse(line);
}
var rows = LoadRows("data.csv");
Console.WriteLine(rows.Count());
Console.WriteLine(rows.First());        // reads the file a second time
```

**Q34** ⭐⭐
```csharp
public class Account
{
    public decimal Balance;                       // public field
    public void Withdraw(decimal a)
    {
        if (a > Balance) throw new InvalidOperationException("insufficient");
        Balance -= a;
    }
}
var acct = new Account { Balance = 100m };
acct.Balance = -5000m;
```

**Q35** ⭐⭐⭐
```csharp
var report = new StringBuilder();
foreach (var line in millionLines)
    report.Append(line);                 // fine

var report2 = "";
foreach (var line in millionLines)
    report2 += line;                     // also "fine"?
```

## Part 3 — Which approach, and why? (Q36–Q45)

**Q36** ⭐⭐ — You're modelling a `Money` value carried around an expense
tracker: an amount and a currency, compared and copied constantly, never
modified after creation. **`record` or `class`?**

**Q37** ⭐⭐ — You're modelling a `BankAccount` with a balance that changes,
an id that identifies *this* account even after the balance moves, and rules
about withdrawals. **`record` or `class`?**

**Q38** ⭐⭐ — A user submits a signup form with an empty email. Should the
validator **throw an exception or return a `Result`?**

**Q39** ⭐⭐ — Your repository is asked to load a config file and the file is
missing from disk on a production server. **Throw or return a `Result`?**

**Q40** ⭐⭐⭐ — You have an `IQuoteRepo` that holds the app's quotes in an
in-memory `List<Quote>`. **`AddSingleton`, `AddScoped`, or `AddTransient`?**

**Q41** ⭐⭐⭐ — You have a `UnitOfWork` that tracks the changes made during one
HTTP request and commits them at the end. **Which lifetime?**

**Q42** ⭐⭐ — You have an `IClock` whose only job is `DateTime Now { get; }`.
**Which lifetime, and why does this type exist at all?**

**Q43** ⭐⭐ — An endpoint needs to reject a request whose `title` is empty and
tell the client which field was wrong. **`Results.BadRequest`,
`Results.ValidationProblem`, or `throw`?**

**Q44** ⭐⭐ — You need to add a `Titleize` helper and a `ChunkBy` helper for
`string` and `IEnumerable<T>`. **Static utility class or extension methods?**

**Q45** ⭐⭐⭐ — You need to fetch three independent HTTP resources inside one
endpoint. **Three sequential `await`s, `Task.WhenAll`, or three `.Result`
calls?**

## Part 4 — Will this compile? (Q46–Q50)

**Q46** ⭐
```csharp
int x = 5.9;
double y = 5;
```

**Q47** ⭐⭐⭐
```csharp
struct Pt { public int X; }
var list = new List<Pt> { new Pt() };
list[0].X = 99;
```

**Q48** ⭐⭐
```csharp
record Money(decimal Amount, string Currency);
var m = new Money(10m, "USD");
m.Amount = 20m;
```

**Q49** ⭐⭐
```csharp
static int Len<T>(T x) => x.Length;
```

**Q50** ⭐⭐
```csharp
class Repo
{
    private readonly List<int> _items = new();
    public void Add(int n) { _items.Add(n); }
    public void Reset()    { _items = new List<int>(); }
}
```

# ANSWERS

## Part 1 — What does this print?

**A1 — `2 2.5 2`** ⭐ `10 / 4` is **integer division** because both operands are
`int` — it truncates, it doesn't round. Making one side a `double` (`4.0`) gives
`2.5`. This is the single most common first-week C# bug for a JS developer.
→ cs#01

**A2 — `False True`** `double` is binary floating point, exactly like every JS
number, so `0.1 + 0.2` is `0.30000000000000004`. `decimal` stores decimal digits
exactly, which is why money belongs in `decimal` (literals get an `m` suffix).
→ cs#02, cs#07

**A3 — `True False`** `==` on `string` compares *contents* — a special case the
language builds in, not the general rule for reference types. `ReferenceEquals`
compares arrows, and a string built at runtime by `string.Concat` is a different
object from the interned literal. → cs#02

**A4 — `99 1`** A class is a **reference type**: `p2 = p1` copies the arrow, so
both names point at one object (aliasing — the same bug as JS objects). A struct
is a **value type**: `v2 = v1` copies the data. → cs#02

**A5 — `True False Money { Amount = 10, Currency = USD }`** Records get value
equality and a readable `ToString` generated for free. They're still reference
types, so `ReferenceEquals` is `False`. In JS you always wanted
`{x:1} === {x:1}` to be true; here it is. → cs#07

**A6 — `False False`** A plain class compares by reference for both `==` and the
inherited `Equals`. Two carts with identical contents are simply different
objects. Contrast A5 — this is the reason records are the default for data.
→ cs#02, cs#07

**A7 — `2,3,4`** LINQ is **deferred**: `query` is a recipe holding a reference to
`source`, and it isn't executed until `string.Join` enumerates it — by which
time `4` has been added. → cs#04

**A8 — `2,3`** `ToList()` forces execution immediately, producing an independent
list. The later `Add` can't reach it. `ToList()` at the boundary is the fix for
A7. → cs#04

**A9 — `1 99`** `list[0]` on a `List<T>` of structs returns a **copy**, so
mutating `copy` changes nothing (the compiler even refuses the shorter
`list[0].X = 99` — see A47). An *array* of structs stores the elements inline, so
`arr[0].X = 99` really does edit in place. This split is why mutable structs are
a bad idea. → cs#02

**A10 — `[3,3,3] [0,1,2]`** A `for` loop has ONE `i` shared by every closure, and
by the time the lambdas run it is `3` — the JavaScript `var` bug, alive and well.
`foreach` creates a fresh variable per iteration, so each lambda captures its
own. → cs#12

**A11 — `3,1,2 | 1,2,3`** `OrderBy` returns a new sequence and leaves the source
untouched; `xs.Sort()` would have mutated `xs` in place. Picking the wrong one
silently reorders somebody else's data. → cs#03, cs#13

**A12 — `b,a,c False 0`** A `Dictionary` preserves *insertion* order in practice
(it does not sort — never rely on any order). `TryGetValue` returns `false` for a
missing key and sets the `out` parameter to the type's default, `0`. → cs#03

**A13 — `0 0 0`** `FirstOrDefault()` on an empty sequence returns the *type's
default*, which for `int` is `0`, not null — so `if (x == 0)` can't tell "empty"
from "the first value was zero". `Sum()` of nothing is `0`. Note `First()` would
have thrown. → cs#04

**A14 — `abc ABC`** Strings are immutable. `s.ToUpper();` on its own line
computes a new string and throws it away; you must use the return value. → cs#01

**A15 — `[fallback] [null] []`** `??` only replaces `null`/`undefined`-ish
values — an empty string is not null, so `"" ?? "x"` is `""` and prints as
nothing. The middle one shows `?.` short-circuiting the whole chain. → cs#05

**A16 — `False -1 0`** `int?` is `Nullable<int>`: a struct with a `HasValue` flag.
`??` supplies a fallback; `GetValueOrDefault()` gives the underlying type's
default. `i.Value` would have thrown `InvalidOperationException`. → cs#05

**A17 — `[0] [False] [null]`** Every type has a **default**: `0` for numeric
types, `False` for `bool`, `null` for reference types. Arrays and fields start
out at these values rather than at `undefined`. → cs#02

**A18 — `False True True`** Boxing a value type puts it in an object on the heap,
and `==` on two `object` variables compares *references*, so it's `False`.
`Equals` is overridden by `int` and compares values. Written as `5 == 5` the
compiler sees two `int`s and compares values. → cs#02

**A19 — `neg zero small big`** A **switch expression** produces a value, supports
relational (`< 0`) and combined (`> 0 and < 10`) patterns, and `_` is the
catch-all. Over an enum, leaving `_` out is a compile *warning* (CS8524) — C#'s
version of exhaustiveness checking. → cs#06

**A20 — `2 False True`** The collection initializer drops the duplicate `"a"`, so
`Count` is 2. `HashSet.Add` returns `false` when the item was already there and
`true` when it was actually added — a handy "have I seen this?" in one call.
→ cs#03

## Part 2 — Spot the bug

**A21 — Deferred execution runs the pipeline once per enumeration; `calls` is 6.**
`Count()` walks all three elements, then `Sum()` walks them again, and the
side-effecting lambda fires each time. Side effects inside `Select` are a bug in
themselves; if you must keep them, materialise with `ToList()` once. → cs#04

**A22 — The `catch` misses.** `.Wait()` is sync-over-async: it blocks a thread
and wraps whatever was thrown in an `AggregateException`, so a
`catch (InvalidOperationException)` doesn't match and the program crashes with an
unhandled exception. Writing `await SaveAsync();` inside an `async` method lets
the original exception through and the `catch` works. → cs#14

**A23 — There is no backup.** `listB = listA` copies the arrow, not the list, so
`listA.Count` prints `3`. A real copy is `new List<int>(listA)`; a real "can't be
changed behind my back" is a record or `IReadOnlyList<T>`. → cs#02

**A24 — The invariant leaks.** Exposing `List<string>` as a public property lets
callers `Add`/`Remove` around the validation in `Add`. Expose
`IReadOnlyList<string>` instead and keep the `List` private — indexing and
`Count` still work, mutation doesn't. → cs#09

**A25 — `KeyNotFoundException` on the first order.** In JS,
`totals[key] + amount` on a missing key gives `NaN`; in C# reading a missing key
*throws*. Use `totals.TryGetValue(k, out var cur)` and add to `cur`, or
`CollectionsMarshal`/`GetValueOrDefault`. → cs#03

**A26 — `InvalidOperationException`: the collection was modified during
enumeration.** C# refuses rather than silently skipping elements the way a JS
`for` loop would. Iterate a copy (`foreach (var n in items.ToList())`) or use
`items.RemoveAll(n => n % 2 == 1)`. → cs#03

**A27 — Prints `7`, not `7.5`.** `scores.Sum()` and `scores.Count` are both `int`,
so the division happens in integer arithmetic and truncates *before* the result
is widened to `decimal`. Cast first: `(decimal)scores.Sum() / scores.Count`. And
an empty list would divide by zero. → cs#01, cs#04

**A28 — Prints `False`;** `total` is `0.9999999999999999`. Ten additions of
binary-floating-point `0.1` don't land exactly on `1.0`. Never compare `double`s
with `==` — compare within a tolerance, or use `decimal` when the number
represents money. → cs#02

**A29 — `InvalidOperationException: Sequence contains no matching element`.**
`First(predicate)` demands a match. (The no-predicate `First()` on an empty
sequence says "Sequence contains no elements" instead.) `FirstOrDefault()`
returns `null` for a reference type — but then `.Name` throws a
`NullReferenceException`, so the real fix is to check:
`users.FirstOrDefault(u => u.IsAdmin) is User u ? u.Name : "none"`. → cs#04, cs#05

**A30 — `NullReferenceException` when nothing has subscribed.** An event with no
handlers is `null`, and `Evicted(this, key)` invokes through it. Always write
`Evicted?.Invoke(this, key);`. (The related leak: every `+=` without a matching
`-=` keeps the subscriber alive.) → cs#12

**A31 — `!` is an assertion, not a check.** It silences the nullable warning and
changes nothing at runtime, so the day `FindName` returns null you get a
`NullReferenceException` — with no clue in the code that anyone considered it.
Narrow instead: `if (name is not null)`, or `name ?? "(unknown)"`. → cs#05

**A32 — A singleton captured a scoped service.** `ReportService` lives for the
app's lifetime but its `IUnitOfWork` is meant to live for one request, so the
first request's unit of work gets frozen into the singleton forever. The
container throws on startup rather than let you ship it. Make `ReportService`
scoped, or inject `IServiceScopeFactory`. → cs#18

**A33 — The file is opened and read twice, and the `using` fights the iterator.**
`LoadRows` returns a lazy iterator, so `Count()` streams the whole file and
disposes the reader, then `First()` starts over from scratch. Materialise once
(`var rows = LoadRows(path).ToList();`) or make the method return a `List<Row>`.
→ cs#04, cs#21

**A34 — The public field defeats the rule.** `Withdraw` guards the balance, but
`acct.Balance = -5000m;` walks straight around it, and there's no single place to
put a breakpoint when the number goes wrong. Make it
`public decimal Balance { get; private set; }`. → cs#09

**A35 — The second loop is quadratic.** Strings are immutable, so `report2 +=
line` allocates a brand-new string containing everything so far on every
iteration — a million lines means a million ever-larger copies. `StringBuilder`
appends into one growable buffer. (In a three-item loop, either is fine; the bug
is one of scale.) → cs#01

## Part 3 — Which approach, and why?

**A36 — `record`.** It's data: defined by its values, never mutated, compared and
copied constantly. A record gives you value equality (`==` compares amount and
currency), a readable `ToString`, and `with` for making modified copies — and
because it can't change, sharing one is automatically safe. → cs#07

**A37 — `class`.** An account has **identity**: account #42 is still account #42
after a withdrawal, and two accounts with the same balance are not the same
account. That's exactly what reference equality means. Records model *values*;
classes model *things*. Keep the balance behind
`{ get; private set; }` so the withdrawal rules can't be bypassed. → cs#02, cs#09

**A38 — Return a `Result`.** An empty email is *expected* — it will happen many
times a day, and the caller can absolutely prevent it. Exceptions used as control
flow are invisible in the signature and slow; a `Result` puts the failure right
in the return type where the compiler makes you handle it. → cs#08, cs#17

**A39 — Throw.** A missing config file at startup is genuinely *exceptional*:
nobody up the call stack can meaningfully continue, and you want a loud stack
trace naming the path, not a value threaded through ten layers. The rule of
thumb: **expected → `Result`, unpreventable → exception.** → cs#08, cs#22

**A40 — `AddSingleton`.** The repo *is* the storage — the `List<Quote>` is the
app's state, so there must be exactly one. A scoped or transient registration
would hand each request its own empty list and quotes would vanish between
calls. → cs#18, cs#21

**A41 — `AddScoped`.** A unit of work is per-request by definition: it collects
that request's changes and commits them at the end. Singleton would share one
across concurrent requests (a correctness disaster); transient would give
different parts of the same request different, uncoordinated units. → cs#18

**A42 — `AddSingleton` (transient is also fine), and it exists to make time
testable.** `DateTime.Now` is a hidden input: it can't be controlled from a test,
so "what does the daily report show on Jan 3rd?" becomes "change your computer's
clock". Behind `IClock`, production registers `SystemClock` and tests register a
`FakeClock`. It's stateless, so any lifetime is safe. → cs#18

**A43 — `Results.ValidationProblem`.** It returns 400 with a **ProblemDetails**
body carrying a per-field `errors` dictionary, which is the standard machine-
readable shape clients can rely on. `BadRequest` with an ad-hoc object works but
invents a private error format; throwing turns a routine validation miss into an
exception. → cs#17, cs#20

**A44 — Extension methods.** A static utility class works, but calls read
inside-out (`Ext.ChunkBy(Ext.Titleize(s), 2)`) and don't chain. Extension methods
(`this string s`) let you write `s.Titleize().ChunkBy(2)` on types you don't own
— which is precisely how LINQ itself is built. → cs#13

**A45 — `Task.WhenAll`.** Three sequential `await`s take the sum of the three
latencies when they could take the maximum; `.Result` blocks threads, risks
deadlock, and wraps exceptions in `AggregateException`. `await Task.WhenAll(a, b,
c)` starts all three and waits for the set — and note the results come back in
*argument* order, not completion order. → cs#14

## Part 4 — Will this compile?

**A46 — ❌ The first line, no; the second, yes.**
`error CS0266: Cannot implicitly convert type 'double' to 'int'. An explicit
conversion exists (are you missing a cast?)` C# widens automatically (`int` into
`double`) but never narrows silently, because narrowing loses data.
`int x = (int)5.9;` compiles and gives `5` — it truncates. → cs#01

**A47 — ❌ No.** `error CS1612: Cannot modify the return value of
'List<Pt>.this[int]' because it is not a variable` The indexer hands back a
*copy* of the struct, so assigning to its field would change something that's
about to be discarded — and the compiler refuses rather than let you write a
no-op. (Read A9 next to this: an *array* of structs allows it, because array
elements are real storage.) → cs#02

**A48 — ❌ No.** `error CS8852: Init-only property or indexer 'Money.Amount' can
only be assigned in an object initializer, or on 'this' or 'base' in an instance
constructor or an 'init' accessor.` A positional record's properties are
`init`-only: settable while the object is being built, frozen afterwards. Make a
modified copy instead: `var m2 = m with { Amount = 20m };`. → cs#07

**A49 — ❌ No.** `error CS1061: 'T' does not contain a definition for 'Length'`
An unconstrained `T` could be anything, so only `object`'s members are available.
Add a constraint that promises what you need — `where T : string` isn't allowed,
but `where T : ICollection` or an interface of your own is, and that constraint
then becomes part of the method's contract. → cs#11

**A50 — ❌ `Reset` doesn't compile; `Add` does.**
`error CS0191: A readonly field cannot be assigned to (except in a constructor
or init-only setter …)` `readonly` freezes the *field* — the arrow — not the
object it points at, so `_items.Add(n)` is perfectly legal. It is exactly the JS
`const arr = []` situation: you can't rebind it, you can still fill it. → cs#02, cs#09

## Scoring

| Score | Where you are |
|-------|---------------|
| 40–50 | You've internalised the value/reference split and the async rules. Go build cs#28. |
| 30–39 | Solid. Re-read the handbook's traps list and redo any project you missed twice. |
| 20–29 | The syntax has landed; the semantics haven't yet. Redo cs#02, cs#04, cs#14 in order. |
| under 20 | Normal for a first pass. Start at cs#01 and work forward — this quiz will still be here. |

Parts 2 and 3 are the ones that matter. Part 1 and 4 check whether you can
predict the compiler and the runtime; parts 2 and 3 check whether you can choose
a design that stops the bug being writable in the first place.
