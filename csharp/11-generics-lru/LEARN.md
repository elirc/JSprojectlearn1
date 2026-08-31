# 📘 Learning Guide: Generic LRU Cache

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

An **LRU cache** — "least recently used". A cache is a small box of remembered answers so you don't recompute or refetch them. But the box has a fixed size, so when it fills up, something has to go. LRU's rule: evict whatever has gone *unused* the longest, because the things you keep touching are the things you'll probably touch again.

You already built this exact machine in js#41 (and typed it in ts#41). The rules are the same:

- `Set` adds an entry; when the cache is full, the stalest entry is evicted.
- *Reading* an entry refreshes it — hot items survive.
- *Updating* an entry refreshes it too.
- `Has` peeks without refreshing — asking "is it there?" shouldn't change anything's fate.

The new lesson is not the cache. It's the *types*. The original stores everything as `object` — C#'s "could be anything" type — and pays for it with a cast at every use site and a runtime crash the compiler never saw coming. The refactor makes the cache **generic**: one class, `LruCache<TKey, TValue>`, that each caller fills in with real types.

## 2. Concepts you need first

### `object`: the type that means "anything"

In C#, every type — `int`, `string`, your own classes — ultimately inherits from `object`. That means any value fits into an `object` variable:

```csharp
object a = "hello";   // fine
object b = 42;        // fine (see "boxing" below)
object c = new List<int>();  // fine
```

Going *in* is free. Coming *out* is the problem: an `object` variable has forgotten what it holds, so you can't call `.Length` or add 1 to it. You must **cast** it back first.

### Casting: a promise the compiler takes on faith

A cast `(string)x` says: "trust me, `x` is really a string." The compiler shrugs and believes you. At *runtime*, .NET checks — and if you lied, you get an `InvalidCastException`:

```csharp
object box = 42;
string s = (string)box;   // compiles fine. CRASHES at runtime.
```

Compare with JavaScript: in JS *every* variable works like `object` — `const x = cache.get("visits")` could be anything, and you find out when `x.toUpperCase()` explodes. TypeScript fixed this with type annotations; C# has them natively. So a C# program full of `object` and casts has thrown away its biggest advantage. **The original file is JavaScript written in C# syntax.**

### Boxing: the hidden cost of `object` for numbers

`int` is a value type (project 02 covered value vs reference). Storing an `int` in an `object` forces .NET to wrap the number in a little heap-allocated box — that's literally called **boxing** — and every read unwraps it (**unboxing**). It works, but a cache that exists to make things fast is quietly allocating garbage on every operation.

### Generics: classes with type placeholders

You have used generics since project 03 without writing one: `List<int>`, `Dictionary<string, double>`, `HashSet<string>`. The angle brackets are the giveaway. `List<T>` is written *once*, with `T` as a placeholder — a **type parameter** — and every caller picks the real type:

```csharp
var numbers = new List<int>();      // T = int for this instance
var names   = new List<string>();   // T = string for this one
numbers.Add("hi");                  // COMPILE error — this List only takes ints
```

Writing your own generic class is just putting the placeholder in your own declaration:

```csharp
public class Pair<TFirst, TSecond>
{
    public TFirst First;
    public TSecond Second;
}

var p = new Pair<string, int> { First = "age", Second = 30 };
int x = p.Second;   // no cast — the compiler KNOWS Second is an int
```

In JS you'd just write `{ first, second }` and hope. In TypeScript you met `<T>` in ts#16/17 — C# generics look identical, with one upgrade: they survive to runtime (a `List<int>` really is a distinct type when the program runs, not an erased annotation).

Naming convention: type parameters start with `T` — `T` alone if there's one, `TKey`/`TValue` style names when there are several.

### Constraints: `where TKey : notnull`

Sometimes "any type at all" is too loose. A **constraint** narrows what a type parameter may be:

```csharp
public class LruCache<TKey, TValue> where TKey : notnull
```

reads as: "TKey can be any type *that is not nullable*." Why? Our cache uses a `Dictionary<TKey, ...>` inside, and dictionary keys may not be null — so we pass the requirement on to our own callers, and the compiler polices it. Other constraints you'll meet: `where T : class` (reference types only), `where T : struct` (value types only), `where T : ICipher` (must implement an interface — see project 10), `where T : new()` (must have a parameterless constructor).

### The `TryGet` pattern and `out` parameters

An `out` parameter is a second return channel: the method fills it in. You've called one many times — `Dictionary.TryGetValue` in project 03:

```csharp
if (map.TryGetValue("ada", out var score))
    Console.WriteLine(score);     // only meaningful when the method returned true
```

The pattern — return `bool` for "found?", deliver the value via `out` — is C#'s standard way to make "not found" a *normal* outcome instead of an exception. Our cache offers both flavours: `TryGet` (miss is expected) and `Get` (miss is a bug, throws). The odd-looking `[MaybeNullWhen(false)]` on `TryGet` is a hint to the nullable checker (project 05): "if I return false, don't trust the out value."

### `LinkedList<T>`: a chain, not an array

A `LinkedList<T>` stores items as a chain of nodes, each pointing to the next. Unlike `List<T>`, removing from the *front* is O(1) — no shuffling everything down one slot. That makes it a natural "recency queue": stalest key at the front, freshest at the back, evict by `RemoveFirst()`.

## 3. Walking through the original code

The storage is two parallel lists:

```csharp
private readonly List<object> keys = new();
private readonly List<object> values = new();
```

`keys[i]` belongs with `values[i]` — a rule that lives only in the programmer's head. Every method must edit both lists identically or the cache silently corrupts. (js#41's original had the same disease with an object + an array.)

`Set` scans for the key, removes an existing entry from *both* lists, evicts from the front of *both* lists when full, and appends to *both*:

```csharp
int i = keys.IndexOf(key);
if (i >= 0) { keys.RemoveAt(i); values.RemoveAt(i); }
else if (keys.Count >= capacity) { keys.RemoveAt(0); values.RemoveAt(0); }
keys.Add(key);
values.Add(value);
```

`Get` finds the index, moves the pair to the recent end (four lines of double bookkeeping), and returns... an `object`:

```csharp
return v;   // as an `object` — the caller has to cast, and hope
```

So the *call sites* pay forever:

```csharp
string name = (string)cache.Get("user:1");
int visits  = (int)cache.Get("visits");
```

And the demo's ending is the payoff line of the whole project:

```csharp
string visitsText = (string)cache.Get("visits");   // compiles without a peep!
```

`visits` holds `42`, an `int`. The cast compiles, runs, and throws `InvalidCastException`.

## 4. What's wrong with it (in beginner terms)

**1. The compiler was fired from its own job.** C#'s superpower — the thing that made projects 01–10 pleasant — is that wrong-type code *doesn't compile*. `object` switches that off: any key, any value, any cast, all "fine" until runtime. The crash arrives later, in production, with a stack trace pointing far from the actual mistake (the `Set` that stored an int where everyone expected a string).

**2. Every call site repeats the risk.** One cache, dozens of `Get` calls, each with its own cast — each an independent chance to be wrong. When the stored type changes (say `visits` becomes a `long`), the compiler won't point at a single stale cast. You get to find them all by crashing.

**3. Two structures, one unenforced sync rule.** Forget a single `values.RemoveAt(i)` and keys and values shift out of alignment — every later `Get` returns *some other entry's value*, with no exception at all. Silent wrongness beats loud crashing only in horror stories.

**4. It's slow in the small ways that add up.** `IndexOf` scans the whole list on every operation, and boxing turns every stored int into a heap allocation. A cache is supposed to be the fast path.

## 5. Try it yourself first!

Before reading on, try converting the original yourself. Hints, vaguest first:

1. 🌱 The cache logic is fine. What would the class look like if the compiler *knew* the key and value types?
2. 🌿 Declare `class LruCache<TKey, TValue>` and replace every `object` with `TKey` or `TValue`. What breaks? (The compiler will complain about dictionary keys being possibly null — that's what a constraint fixes.)
3. 🌳 Swap the parallel lists for a `Dictionary<TKey, TValue>` (the data) plus a `LinkedList<TKey>` (the order, oldest at the front). Which methods must "touch" a key — move it to the back of the list?
4. 🍎 Full shape: `Set` = update-and-touch, or evict-front-then-add; `TryGet` = dictionary lookup + touch; `Has` = lookup, *no* touch. Then write tests for the three recency rules (read refreshes, update refreshes, peek doesn't) before you trust it.

## 6. Understanding the refactored solution

The declaration says most of it:

```csharp
public class LruCache<TKey, TValue> where TKey : notnull
{
    private readonly Dictionary<TKey, TValue> map = new();
    private readonly LinkedList<TKey> recency = new();
```

One dictionary owns the data (O(1) lookups, no casts, no boxing into `object`). One linked list owns *only the order* — front is stalest. Note the list stores just keys: there's exactly one place a value lives, so the parallel-list corruption bug has nothing to corrupt.

Reading refreshes:

```csharp
public bool TryGet(TKey key, [MaybeNullWhen(false)] out TValue value)
{
    if (map.TryGetValue(key, out value))
    {
        Touch(key);         // reading an entry counts as "using" it
        return true;
    }
    return false;
}
```

`Set` handles the two cases explicitly — update (refresh, don't grow) versus insert (evict first if full):

```csharp
if (map.ContainsKey(key)) { map[key] = value; Touch(key); return; }
if (map.Count >= Capacity)
{
    TKey oldest = recency.First!.Value;   // front = least recently used
    recency.RemoveFirst();
    map.Remove(oldest);
}
map[key] = value;
recency.AddLast(key);
```

And the deliberate non-feature, documented and tested:

```csharp
/// Peeking deliberately does NOT refresh recency ...
public bool Has(TKey key) => map.ContainsKey(key);
```

`Touch` is `recency.Remove(key); recency.AddLast(key);` — with an honest comment: `Remove(value)` walks the list, O(n). That's fine here and keeps the code readable; the O(1) production version (store `LinkedListNode<TKey>` handles in a dictionary) is Experiment 4 below.

The demo's closing argument is the whole lesson in two lines: `visits.Get("home")` returns an `int` with no cast, and `visits.Set("home", "lots")` *does not compile*. The original's runtime crash became a red squiggle — the cheapest kind of bug there is. Notice also what the tests DON'T contain: there is no test for "wrong type stored" because such a program can no longer be written. The best tests are the ones the type system makes unnecessary (the "make invalid states unrepresentable" idea from projects 06 and 08).

## 7. Words you learned (glossary)

- **Cache** — a bounded box of remembered answers, traded for memory.
- **LRU (least recently used)** — eviction policy: the longest-unused entry goes first.
- **Eviction** — removing an entry to make room.
- **`object`** — the root type every C# type inherits from; an "anything box" that forgets what's inside.
- **Cast** — `(string)x`: telling the compiler to treat a value as a type, checked only at runtime.
- **`InvalidCastException`** — the runtime's answer to a cast that lied.
- **Boxing / unboxing** — wrapping a value type (like `int`) in a heap object to store it as `object`, and unwrapping it again.
- **Generics** — writing a class or method once with type placeholders that callers fill in.
- **Type parameter** — the placeholder (`T`, `TKey`, `TValue`) in a generic declaration.
- **Type argument** — the real type a caller supplies: `LruCache<string, int>`.
- **Constraint (`where`)** — a rule limiting what a type parameter may be, e.g. `where TKey : notnull`.
- **`notnull`** — constraint meaning "no nullable types allowed here."
- **`out` parameter** — a parameter the method assigns as an extra return channel.
- **TryGet pattern** — `bool` return + `out` value: misses are normal outcomes, not exceptions.
- **`[MaybeNullWhen(false)]`** — attribute telling the nullable checker the out value is only trustworthy on `true`.
- **`LinkedList<T>` / `LinkedListNode<T>`** — a chain of nodes; O(1) removal at the ends, no index shuffling.
- **Parallel collections** — two structures whose indices must stay aligned by hand; a bug generator.

## 8. Experiments to try on the plane (no internet needed)

Run tests after each change: `dotnet run --project csharp/11-generics-lru/refactored -- test`

1. **Feel the compiler catch the original's bug.** In `Program.cs`, add `visits.Set("home", "lots");` and build. Expected: a compile error — `cannot convert from 'string' to 'int'`. Delete the line, then re-run the *original* and compare: same mistake, but there it costs a runtime crash instead of a red squiggle.
2. **New shapes for free.** Create `var routes = new LruCache<int, List<string>>(2);` in `Program.cs`, store `new List<string> { "GET", "POST" }` under key `404`, read it back and print `routes.Get(404).Count`. Expected: works with zero changes to `LruCache.cs` — one generic class, endless uses.
3. **Break a recency rule and watch the net catch you.** In `TryGet`, delete the `Touch(key);` line. Expected: two tests fail — "a recently READ entry survives eviction" and its partner. That pair of tests *is* the definition of LRU; without them you'd have js#41's original bug (recently-*added* cache) and no alarm.
4. **The O(1) upgrade.** Add `private readonly Dictionary<TKey, LinkedListNode<TKey>> nodes = new();` and store each key's node when you `AddLast`. In `Touch`, replace `recency.Remove(key)` (O(n) scan) with `recency.Remove(nodes[key])` (O(1) — you hand it the node directly), then re-add and update the map. Expected: all tests still pass — you changed performance, not behaviour, and the tests prove it.
5. **Add `Clear()`.** Write a method that empties both structures, plus a test: fill a cache, `Clear()`, then check `Count == 0` and `Has` returns false. Expected: trivial to write — and notice you must clear *both* structures. Even the refactor has one two-structure rule left; tests are what make it safe to have.
