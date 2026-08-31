# 🏋️ Practice: Generics (LRU Cache)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Peek without using (warm-up)

`Has(key)` deliberately does not refresh recency, but it only tells you *whether* an entry exists. Add `TryPeek(TKey key, out TValue value)` — the same answer plus the value, still without touching the recency order. Copy `TryGet`'s signature exactly, including the `[MaybeNullWhen(false)]` attribute, and leave out the one line that makes it different.

Practices: the `bool` + `out` convention, `[MaybeNullWhen(false)]`, and the idea that "reading" and "using" can be two different things.

Hint: it is `TryGet` minus the `Touch(key);` call. The attribute is why `out var value` is usable without a null warning after a `true` result.

Check it offline: add these Check tests to `Tests.cs` — all should pass:
```csharp
var pk = new LruCache<string, int>(3);
pk.Set("a", 1); pk.Set("b", 2); pk.Set("c", 3);
Check.True(pk.TryPeek("a", out var peeked) && peeked == 1, "TryPeek returns the value");
pk.Set("d", 4);
Check.Equal(false, pk.Has("a"), "peeking did NOT save a from eviction");
Check.Equal(false, pk.TryPeek("nope", out _), "TryPeek reports a miss like TryGet does");
```

### ⭐⭐ 2. Evict on demand (core)

Add `public bool Remove(TKey key)` returning `true` if something was removed, `false` if the key was not there. The catch is the one the README warns about: this class still has two structures with a hand-maintained sync rule, so a `Remove` that forgets the `LinkedList` leaves a ghost key in `KeysByAge` that will later be "evicted" from a dictionary that has never heard of it.

Practices: the two-structure discipline, `Dictionary.Remove`'s `bool` return, writing the test that catches the bug you almost shipped.

Hint: `map.Remove(key)` already returns the `bool` you want — use it as the early-exit guard, then clean the recency list. The `KeysByAge` assertion below is what catches a half-done removal.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var rm = new LruCache<string, int>(3);
rm.Set("a", 1); rm.Set("b", 2);
Check.True(rm.Remove("a"), "removing a present key reports true");
Check.Equal(false, rm.Remove("a"), "removing it twice reports false");
Check.Equal(1, rm.Count, "Count drops");
Check.Equal("b", string.Join(",", rm.KeysByAge), "the recency list was cleaned up too");
rm.Set("c", 3); rm.Set("d", 4);
Check.True(rm.Has("b"), "the freed slot means b survives — no ghost key was evicted instead");
```

### ⭐⭐ 3. Compute-on-miss (core)

Every cache eventually grows the same method: `GetOrAdd(TKey key, Func<TKey, TValue> factory)`. On a hit it returns the cached value and refreshes recency; on a miss it calls `factory(key)`, stores the result, and returns it. The factory must run *exactly once* per miss and never on a hit — prove that with a counter in your test.

Practices: `Func<TKey, TValue>` as a parameter (a function passed as a value — JS's daily bread, C#'s explicit type), and the cache-aside pattern that every real cache API exposes.

Hint: build it out of what you already have — `if (TryGet(key, out var existing)) return existing;` then create, `Set`, and return. Do not reach into `map` directly; going through the public doors keeps the recency rules correct for free.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
int factoryCalls = 0;
var memo = new LruCache<string, int>(2);
Check.Equal(5, memo.GetOrAdd("hello", k => { factoryCalls++; return k.Length; }), "a miss computes the value");
Check.Equal(5, memo.GetOrAdd("hello", k => { factoryCalls++; return 999; }), "a hit returns the cached value");
Check.Equal(1, factoryCalls, "the factory ran exactly once");
```

### ⭐⭐ 4. Tell me what you threw away (core)

Caches are silent by nature, which makes them hard to tune. Let the caller pass an optional `Action<TKey, TValue>? onEvicted` to the constructor, fired with the key *and* value whenever `Set` makes room by evicting. Give it a default of `null` so every existing `new LruCache<...>(3)` call keeps compiling.

Practices: delegates as constructor parameters (a preview of project 12's events), optional parameters, and `?.Invoke` for "maybe nobody is listening".

Hint: you must read the victim's value out of `map` *before* `map.Remove(oldest)` — after that it is gone. `onEvicted?.Invoke(oldest, victim);` is the null-safe call.

Check it offline: add to `Tests.cs` — both should pass:
```csharp
var evicted = new List<string>();
var watched = new LruCache<string, string>(2, (k, v) => evicted.Add($"{k}={v}"));
watched.Set("a", "A"); watched.Set("b", "B"); watched.Set("c", "C");
Check.Equal("a=A", string.Join(",", evicted), "the callback saw the evicted key AND its value");
watched.Set("b", "B2");
Check.Equal("a=A", string.Join(",", evicted), "updating an existing key evicts nothing");
```

### ⭐⭐⭐ 5. A cache of a different shape (challenge)

Add `public LruCache<TKey, TNew> MapValues<TNew>(Func<TValue, TNew> convert)` — it returns a **new** cache with the same keys, the same capacity, and the same recency order, but every value run through `convert`. So `LruCache<string, int>` becomes `LruCache<string, string>` with one call. The recency order must survive: if `a` was refreshed last, it is still last in the copy.

Practices: a **generic method** with its own type parameter on top of the class's — the same trick LINQ's `Select<TSource, TResult>` uses.

Hint: `TNew` is declared on the method, not the class, so callers write `cache.MapValues(n => n.ToString())` and the compiler infers it. Insert into the copy by iterating `recency` (least → most recent); since the capacity matches, nothing gets evicted on the way in.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var nums = new LruCache<string, int>(3);
nums.Set("a", 1); nums.Set("b", 2); nums.Set("c", 3);
nums.TryGet("a", out _);                                  // a is now the freshest
var tens = nums.MapValues(n => n * 10);
Check.Equal(30, tens.Get("c"), "values were converted");
Check.Equal("b,c,a", string.Join(",", tens.KeysByAge), "and the recency order came with them");
var words = nums.MapValues(n => $"#{n}");
Check.Equal("#2", words.Get("b"), "one method, any target type: LruCache<string, string> now");
```

### ⭐⭐⭐ 6. Entries that go stale (challenge)

Real caches expire. Add two optional constructor parameters: `TimeSpan? ttl = null` and `Func<DateTime>? clock = null`. Store each value together with its deadline in a `private readonly record struct Entry(TValue Value, DateTime? ExpiresAt)`, and make `TryGet` treat an expired entry as a miss — removing it on the way out. The `clock` parameter is the important half: default it to `() => DateTime.UtcNow`, but let a test hand in a fake clock so you can jump forward eleven minutes without sleeping for eleven minutes.

Practices: wrapping a generic value in a private nested type, `TimeSpan?`/`DateTime?` pattern matching, and dependency-injecting *time* so behaviour that depends on the clock is testable.

Hint: `ttl is TimeSpan span ? now() + span : null` computes the deadline in `Set`. In `TryGet`, `if (entry.ExpiresAt is DateTime deadline && now() >= deadline)` is the expiry check. A nested type inside `LruCache<TKey, TValue>` can use `TValue` freely.

Check it offline: add to `Tests.cs` — all should pass (no `Thread.Sleep` anywhere):
```csharp
var fakeNow = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
var sessions = new LruCache<string, string>(5, ttl: TimeSpan.FromMinutes(10), clock: () => fakeNow);
sessions.Set("session", "ada");
Check.True(sessions.TryGet("session", out var who) && who == "ada", "a fresh entry is a hit");
fakeNow = fakeNow.AddMinutes(11);                        // time travel, for free
Check.Equal(false, sessions.TryGet("session", out _), "an expired entry is a miss");
Check.Equal(0, sessions.Count, "and the expired entry was purged, not left to rot");
```

## Solutions

### 1. Peek without using

```csharp
/// Like TryGet, but does NOT count as "using" the entry — the same design
/// call Has() makes, now with the value attached.
public bool TryPeek(TKey key, [MaybeNullWhen(false)] out TValue value)
    => map.TryGetValue(key, out value);
```

WHY: `Dictionary.TryGetValue` already has exactly this signature, so the whole method is a forward — which is the point: the *only* thing that made `TryGet` an LRU operation was the `Touch` call. Keeping a non-touching read available matters for debuggers, admin screens and metrics, where looking at a cache should not change which entries survive. The `[MaybeNullWhen(false)]` attribute is what tells the nullable analyzer "the `out` may be null only when I return false", so callers get no false warnings.

### 2. Evict on demand

```csharp
public bool Remove(TKey key)
{
    if (!map.Remove(key)) return false;   // not here -> nothing to clean up
    recency.Remove(key);                  // the OTHER structure. Never forget this line.
    return true;
}
```

WHY: `Dictionary.Remove` returns `false` for an absent key rather than throwing, so it doubles as the existence check and the removal — one lookup, not two. The line that matters is the second one: this class's remaining weakness is that two structures must agree, and the `KeysByAge` assertion in the test is what turns that from a comment into a checked fact. Ghost keys are the nastiest kind of bug because the damage shows up in a *later* `Set`, far from the missing line.

### 3. Compute-on-miss

```csharp
/// Cache-aside in one method: hit -> cached value; miss -> compute, store, return.
public TValue GetOrAdd(TKey key, Func<TKey, TValue> factory)
{
    if (TryGet(key, out var existing)) return existing;
    var created = factory(key);
    Set(key, created);
    return created;
}
```

WHY: written on top of `TryGet` and `Set`, it inherits every recency rule automatically — a version that poked at `map` directly would have to re-implement `Touch`, eviction and the capacity check, and would drift the first time one of them changed. `Func<TKey, TValue>` is C# spelling out what JS leaves implicit: a parameter that is a function, with its input and output types declared. (In a multithreaded cache this method is famously *not* atomic — two threads can both miss and both compute; `ConcurrentDictionary.GetOrAdd` documents the same caveat.)

### 4. Tell me what you threw away

```csharp
private readonly Action<TKey, TValue>? onEvicted;

public LruCache(int capacity, Action<TKey, TValue>? onEvicted = null)
{
    if (capacity < 1)
        throw new ArgumentOutOfRangeException(nameof(capacity), "capacity must be at least 1");
    Capacity = capacity;
    this.onEvicted = onEvicted;
}

// inside Set, in the "we are full" branch:
if (map.Count >= Capacity)
{
    TKey oldest = recency.First!.Value;
    var victim = map[oldest];          // grab the value BEFORE removing it
    recency.RemoveFirst();
    map.Remove(oldest);
    onEvicted?.Invoke(oldest, victim); // maybe nobody is listening — that's fine
}
```

WHY: the optional parameter with a `null` default is what keeps every existing `new LruCache<string, int>(2)` compiling, so this is a purely additive change — a habit worth keeping. `Action<TKey, TValue>` is a delegate: a *variable holding a method*, the thing project 12 turns into the `event` keyword. Note that only genuine evictions fire it — updating an existing key replaces a value without anyone losing their place, and the second assertion in the test pins that distinction down.

### 5. A cache of a different shape

```csharp
/// TNew belongs to the METHOD, not the class — the same shape as LINQ's
/// Select<TSource, TResult>. Callers never write it: it is inferred.
public LruCache<TKey, TNew> MapValues<TNew>(Func<TValue, TNew> convert)
{
    var copy = new LruCache<TKey, TNew>(Capacity);
    foreach (var key in recency)               // least -> most recently used
        copy.Set(key, convert(map[key]));      // inserting in that order rebuilds it
    return copy;
}
```

WHY: two type parameters from the class plus one from the method is where generics start feeling like a language rather than a feature — and the payoff is that `MapValues` is written once and works for every source and target type combination that will ever exist. Iterating `recency` instead of `map` is the load-bearing detail: `Dictionary` makes no ordering promise, so copying from it would scramble exactly the property the class exists to maintain. Because `copy` has the same capacity, inserting all `Count` entries can never trigger an eviction mid-copy.

### 6. Entries that go stale

```csharp
// Nested inside the generic class, so it can use TValue for free.
private readonly record struct Entry(TValue Value, DateTime? ExpiresAt);

private readonly Dictionary<TKey, Entry> map = new();   // was Dictionary<TKey, TValue>
private readonly TimeSpan? ttl;
private readonly Func<DateTime> now;

public LruCache(int capacity, TimeSpan? ttl = null, Func<DateTime>? clock = null)
{
    if (capacity < 1)
        throw new ArgumentOutOfRangeException(nameof(capacity), "capacity must be at least 1");
    Capacity = capacity;
    this.ttl = ttl;
    this.now = clock ?? (() => DateTime.UtcNow);   // real time unless a test says otherwise
}

public bool TryGet(TKey key, [MaybeNullWhen(false)] out TValue value)
{
    if (map.TryGetValue(key, out var entry))
    {
        if (entry.ExpiresAt is DateTime deadline && now() >= deadline)
        {
            Remove(key);          // exercise 2's method: a miss, and purge it
            value = default;
            return false;
        }
        value = entry.Value;
        Touch(key);
        return true;
    }
    value = default;
    return false;
}

// Set changes only in how it builds what it stores:
var entry = new Entry(value, ttl is TimeSpan span ? now() + span : null);
// ...then map[key] = entry; wherever it used to write the raw value.

public bool Has(TKey key) =>
    map.TryGetValue(key, out var entry) &&
    (entry.ExpiresAt is not DateTime deadline || now() < deadline);
```

WHY: the value type changed from `TValue` to `Entry` *inside* the class only — every public signature still speaks `TValue`, so no caller noticed. The real lesson is the `clock` parameter: code that calls `DateTime.UtcNow` directly can only be tested by actually waiting, which is why such tests are slow, flaky, or simply never written. Injecting time as a `Func<DateTime>` costs one parameter and buys instant, deterministic expiry tests — and it is the same dependency-injection idea, in miniature, that project 18 applies to whole services. (.NET 8 shipped an abstraction for exactly this, `TimeProvider`; a `Func<DateTime>` is its two-line ancestor.)
