# 🏋️ Practice: LINQ Pipeline

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Grand total (warm-up)

Add `GrandTotal(IEnumerable<Sale> sales)` to `SalesReport`: total revenue across all sales, no grouping, no filtering. One pipeline stage is enough.

Practices: `Sum` with a selector — the simplest reduce there is.

Hint: `Sum` can take a lambda that picks the number out of each item. On an empty sequence it returns 0 by itself — no guard needed.

Check it offline: add this Check test to `Tests.cs` — both should pass:
`Check.Equal(1045m, SalesReport.GrandTotal(Sample), "all eight sales add up");`
`Check.Equal(0m, SalesReport.GrandTotal(Empty), "empty sums to zero, no crash");`

### ⭐⭐ 2. Regions ranked by revenue (core)

Add `RegionsByRevenue(IEnumerable<Sale> sales)` returning `List<string>` — region names ordered by total revenue, biggest first. For the test sample: West (490), North (380), South (175).

Practices: `GroupBy` + `OrderByDescending` + `Select` — ranking groups, then keeping only their names.

Hint: it's `TopProduct`'s pipeline with two changes — group by `Region`, and instead of `.First().Key` keep *all* keys with `.Select(g => g.Key).ToList()`.

Check it offline: add to `Tests.cs` — it should pass:
`Check.Equal("West,North,South", string.Join(",", SalesReport.RegionsByRevenue(Sample)), "ranked by revenue");`

### ⭐⭐ 3. The cheapest sale (core)

Add `CheapestSale(IEnumerable<Sale> sales)` returning the whole `Sale` record (not just a number) with the smallest amount. Like `TopProduct`, decide the empty case honestly: there is no cheapest of nothing, so it should throw.

Practices: sorting to select a whole record, `First()` as "take the winner", leaning on record value-equality in tests.

Hint: `OrderBy` (ascending this time) then `First()` — which throws `InvalidOperationException` on empty for free, no explicit check needed.

Check it offline: add to `Tests.cs` — both should pass (`Check.Equal` works because records compare by value):
`Check.Equal(new Sale("Mouse", "North", 40m), SalesReport.CheapestSale(Sample), "the 40 mouse wins");`
`Check.Throws<InvalidOperationException>(() => SalesReport.CheapestSale(Empty), "no cheapest of nothing");`

### ⭐⭐ 4. Port from JS: the receipt (core)

Port this JS pipeline into `SalesReport` as `Receipt(IEnumerable<Sale> sales, string region)`:

```js
const receipt = sales
  .filter(s => s.region === region)
  .map(s => `${s.product}: ${s.amount}`)
  .join("\n");
```

Practices: the filter→map→join translation — `Where`, `Select`, and `string.Join`.

Hint: `join` flips inside-out in C#: it's `string.Join("\n", pipeline)`, a static method wrapping the sequence, not a method at the end of the chain.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal("Monitor: 300\nWebcam: 80\nKeyboard: 110", SalesReport.Receipt(Sample, "West"), "west receipt, source order");`
`Check.Equal("", SalesReport.Receipt(Sample, "Nowhere"), "unknown region -> empty receipt");`

### ⭐⭐⭐ 5. Count and total per region, in one pass (challenge)

Add `StatsByRegion(IEnumerable<Sale> sales)` returning `Dictionary<string, (int Count, decimal Total)>` — for each region, *both* how many sales and their revenue, computed in one `GroupBy`. The new move: a tuple as the dictionary's **value type**.

Practices: `ToDictionary` producing tuples, one grouping answering two questions.

Hint: the value selector can build a tuple on the spot: `g => (g.Count(), g.Sum(s => s.Amount))`.

Check it offline: add to `Tests.cs` — both should pass (tuples compare by value, so `Check.Equal` just works):
```csharp
var stats = SalesReport.StatsByRegion(Sample);
Check.Equal((3, 380m), stats["North"], "North: 3 sales, 380 total");
Check.Equal((2, 175m), stats["South"], "South: 2 sales, 175 total");
```

### ⭐⭐⭐ 6. Median sale amount (challenge)

Add `MedianAmount(IEnumerable<Sale> sales)`: sort the amounts, take the middle one — or the average of the two middle ones when the count is even. LINQ has `Average` but no `Median`, so this is where the pipeline ends in a `ToList()` and honest index math takes over. Empty input should throw `InvalidOperationException` (same reasoning as `TopProduct`).

Practices: knowing when to *leave* LINQ — materialize with `ToList()`, then index; integer division for the midpoint; odd/even cases.

Hint: after `Select(s => s.Amount).OrderBy(a => a).ToList()`, the midpoint is `Count / 2`. Odd count → that element; even count → average it with its left neighbor. For the sample's 8 amounts (40, 55, 80, 90, 110, 120, 250, 300) that's (90 + 110) / 2.

Check it offline: add to `Tests.cs` — all three should pass:
```csharp
Check.Equal(100m, SalesReport.MedianAmount(Sample), "even count: mean of the middle two");
Check.Equal(20m, SalesReport.MedianAmount(new List<Sale> { new("A", "X", 10m), new("B", "X", 30m), new("C", "X", 20m) }), "odd count: the middle one");
Check.Throws<InvalidOperationException>(() => SalesReport.MedianAmount(Empty), "no median of nothing");
```

## Solutions

### 1. Grand total

```csharp
public static decimal GrandTotal(IEnumerable<Sale> sales) =>
    sales.Sum(s => s.Amount);
```

WHY: `Sum` with a selector is filter-free reduce — it projects and adds in one call. Unlike `Average`, `Sum` defines the empty case itself (zero), so no guard is needed; knowing *which* LINQ operators throw on empty (`First`, `Average`, `Max`) and which don't (`Sum`, `Count`, `Where`) is half the skill.

### 2. Regions ranked by revenue

```csharp
public static List<string> RegionsByRevenue(IEnumerable<Sale> sales) =>
    sales.GroupBy(s => s.Region)
         .OrderByDescending(g => g.Sum(s => s.Amount))
         .Select(g => g.Key)
         .ToList();
```

WHY: identical skeleton to `TopProduct` — group, rank, harvest — proving these pipelines are reusable *shapes*. Each group `g` is both a label (`g.Key`) and a sequence you can `Sum`. The final `Select` narrows from "groups" to "names": we sort *by* revenue but *return* only keys.

### 3. The cheapest sale

```csharp
public static Sale CheapestSale(IEnumerable<Sale> sales) =>
    sales.OrderBy(s => s.Amount).First();
```

WHY: sorting whole records by one property and taking `First()` yields the complete winner, not just its amount — often you want the record so the caller can read any field. `First()` on an empty sequence throws `InvalidOperationException`, which matches the project's policy from `TopProduct`: no honest answer means a loud failure, and a test pins it.

### 4. Port from JS: the receipt

```csharp
public static string Receipt(IEnumerable<Sale> sales, string region) =>
    string.Join("\n", sales.Where(s => s.Region == region)
                           .Select(s => $"{s.Product}: {s.Amount}"));
```

WHY: `filter`→`Where`, `map`→`Select`, template literal→interpolation — a one-to-one translation until `join`, which in C# is the static `string.Join(separator, items)` wrapped *around* the pipeline. On no matches it produces `""`, mirroring JS's `[].join("\n")` — a happy accident worth pinning with a test.

### 5. Count and total per region, in one pass

```csharp
public static Dictionary<string, (int Count, decimal Total)> StatsByRegion(IEnumerable<Sale> sales) =>
    sales.GroupBy(s => s.Region)
         .ToDictionary(g => g.Key, g => (g.Count(), g.Sum(s => s.Amount)));
```

WHY: one `GroupBy` builds the buckets once; the value selector then asks each bucket two questions and packs the answers into a tuple — no second pass, no second dictionary, no tiny class to declare. The names in the return type (`Count`, `Total`) are for readers: callers write `stats["North"].Total` instead of `.Item2`.

### 6. Median sale amount

```csharp
public static decimal MedianAmount(IEnumerable<Sale> sales)
{
    var sorted = sales.Select(s => s.Amount).OrderBy(a => a).ToList();
    if (sorted.Count == 0)
        throw new InvalidOperationException("no sales — there is no median");
    int mid = sorted.Count / 2;
    return sorted.Count % 2 == 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}
```

WHY: median needs *positions*, and `IEnumerable` has none — so the pipeline does what it's good at (project, sort), then `ToList()` materializes and plain indexing finishes the job. Forcing everything into one LINQ chain here would be less readable, not more; knowing when to stop chaining is part of the lesson. `Count / 2` uses integer division: for 8 items `mid` is 4, and the even branch averages slots 3 and 4.
