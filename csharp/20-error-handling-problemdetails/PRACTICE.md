# 🏋️ Practice: Error Handling & ProblemDetails

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Restock an item (warm-up)

Add `InventoryService.Restock(int id, int amount)` (raises stock by `amount`) and
`POST /items/{id}/restock` taking `{"amount":5}`. Unknown id → 404, `amount <= 0` → 400 — and here's
the point: you get both **without writing a single catch or status code**, because the exceptions you
throw are already in the mapper's table.
*Practices:* the domain layer + feeling the one-middleware design pay for itself.
**Hint:** throw `ItemNotFoundException` and `ArgumentException`; copy `Purchase`'s lock-and-`with` shape.
**Check offline:** `Check.Equal(15, inv.Restock(1, 3).Stock, "restock adds")` and
`Check.Throws<ArgumentException>(() => inv.Restock(1, 0), "zero is not a restock")` pass;
`curl -i -X POST http://localhost:5020/items/99/restock -H "Content-Type: application/json" -d "{\"amount\":5}"` → `404` ProblemDetails.

### ⭐⭐ 2. Duplicate names are a conflict (core)

Adding an item whose name already exists (case-insensitive, trimmed) should fail with
`409 Conflict`. Create `DuplicateItemNameException`, throw it from `Add`, and give it a row in
`ErrorMapper` with title `"Duplicate item"`.
*Practices:* the full new-error-type route: domain exception → mapper row → tests, zero endpoint edits.
**Hint:** the check goes inside `Add`'s lock, after the name/stock/category validation.
**Check offline:** add this Check test — it should pass:
`Check.Throws<DuplicateItemNameException>(() => inv.Add("  keyboard ", "electronics", 1), "names collide case-insensitively");`
plus `Check.Equal(409, ErrorMapper.Map(new DuplicateItemNameException("Pen")).Status, "duplicates map to 409");`

### ⭐⭐ 3. Machine-readable error codes (core)

`title` is for humans; frontends prefer a stable code to switch on. Extend `Map` to return a fourth
tuple element `Code` (`"item_not_found"`, `"unknown_category"`, `"out_of_stock"`, `"invalid_input"`,
`"duplicate_item"`, `"server_error"`) and have the middleware put it into the ProblemDetails body via
the `extensions` parameter of `Results.Problem`.
*Practices:* evolving the policy table + ProblemDetails extension members.
**Hint:** named tuple elements mean old code reading `.Status`/`.Detail` keeps compiling; extensions is
`new Dictionary<string, object?> { ["code"] = code }`.
**Check offline:** `Check.Equal("item_not_found", ErrorMapper.Map(new ItemNotFoundException(1)).Code, "stable code")` passes; `curl -s http://localhost:5020/items/99` → body now contains `"code":"item_not_found"`.

### ⭐⭐ 4. DELETE /items/{id} (core)

Add `InventoryService.Remove(int id)` (throws `ItemNotFoundException` when absent) and
`DELETE /items/{id}` answering `204 No Content`. Deleting twice: first 204, then a ProblemDetails 404
— same envelope as every other failure in the app.
*Practices:* reusing an existing domain exception instead of inventing a second "not found" path.
**Hint:** `void` is an honest return here — "it worked or it threw"; the endpoint returns `Results.NoContent()`.
**Check offline:** `Check.Throws<ItemNotFoundException>(() => { inv.Remove(3); inv.Remove(3); }, "second delete throws")` passes; `curl -i -X DELETE http://localhost:5020/items/2` twice → `204` then `404`.

### ⭐⭐⭐ 5. All-or-nothing batch purchase (challenge)

Add `POST /items/purchase-batch` taking `{"ids":[1,2,1]}`: purchase every listed id (duplicates mean
multiple units!) or **none of them**. If id 3 has 1 in stock, `{"ids":[2,3,3]}` must throw
`OutOfStockException` and leave item 2's stock *untouched* — no half-finished orders. Write the test
proving nothing changed before you trust it.
*Practices:* transactional thinking in the pure domain layer: validate everything, then mutate.
**Hint:** inside one `lock`, first loop over `ids.GroupBy(id => id)` checking `item.Stock >= group.Count()`, and only after every check passes, do the decrements.
**Check offline:** add these Check tests — they should pass:
`Check.Throws<OutOfStockException>(() => inv.PurchaseMany(new[] { 2, 3, 3 }), "one bad id sinks the batch");`
`Check.Equal(40, inv.Get(2).Stock, "and the good id was NOT decremented");`

## Solutions

### 1. Restock

```csharp
// InventoryService.cs
public Item Restock(int id, int amount)
{
    if (amount <= 0) throw new ArgumentException("restock amount must be positive");
    lock (_lock)
    {
        var item = _items.FirstOrDefault(i => i.Id == id) ?? throw new ItemNotFoundException(id);
        var updated = item with { Stock = item.Stock + amount };
        _items[_items.IndexOf(item)] = updated;
        return updated;
    }
}

// Program.cs — no try/catch, like every other endpoint
app.MapPost("/items/{id}/restock", (int id, RestockDto dto, InventoryService inv)
    => Results.Ok(inv.Restock(id, dto.Amount)));

// bottom of Program.cs, next to NewItem
public record RestockDto(int Amount);
```

WHY: both failure paths ride rails that already exist — `ItemNotFoundException` → 404 and
`ArgumentException` → 400 are rows in the mapper's table. That's the compounding payoff of the
design: each new feature buys its error handling for free, instead of pasting a fresh try/catch.

### 2. Duplicate names

```csharp
// DomainExceptions.cs
public class DuplicateItemNameException : Exception
{
    public DuplicateItemNameException(string name)
        : base($"an item named '{name}' already exists") { }
}

// InventoryService.cs — inside Add, first line within the lock
if (_items.Any(i => string.Equals(i.Name, name.Trim(), StringComparison.OrdinalIgnoreCase)))
    throw new DuplicateItemNameException(name.Trim());

// ErrorMapper.cs — one new row, above the catch-all
DuplicateItemNameException e => (409, "Duplicate item", e.Message),

// Tests.cs
Check.Throws<DuplicateItemNameException>(() => inv.Add("  keyboard ", "electronics", 1),
    "names collide case-insensitively");
Check.Equal(409, ErrorMapper.Map(new DuplicateItemNameException("Pen")).Status, "duplicates map to 409");
Check.Equal(3, inv.GetAll().Count, "the rejected duplicate was never stored");
```

WHY: 409 because the *request* is fine — it's the current state of the inventory that says no, the
same reasoning as out-of-stock. The check sits inside the lock so two simultaneous adds can't both
pass it; the endpoint layer never learns this rule exists, which is how it should be.

### 3. Error codes

```csharp
// ErrorMapper.cs — the tuple grows a named element
public static (int Status, string Title, string Detail, string Code) Map(Exception ex) => ex switch
{
    ItemNotFoundException e      => (404, "Item not found", e.Message, "item_not_found"),
    UnknownCategoryException e   => (400, "Unknown category", e.Message, "unknown_category"),
    OutOfStockException e        => (409, "Out of stock", e.Message, "out_of_stock"),
    DuplicateItemNameException e => (409, "Duplicate item", e.Message, "duplicate_item"),
    ArgumentException e          => (400, "Invalid input", e.Message, "invalid_input"),
    _                            => (500, "Unexpected server error",
                                     "Something went wrong on our side. The details were logged.", "server_error"),
};

// Program.cs — the middleware forwards it
var (status, title, detail, code) = ErrorMapper.Map(ex);
if (status == 500) app.Logger.LogError(ex, "Unhandled exception");
await Results.Problem(title: title, detail: detail, statusCode: status,
        extensions: new Dictionary<string, object?> { ["code"] = code })
    .ExecuteAsync(context);

// Tests.cs
Check.Equal("item_not_found", ErrorMapper.Map(new ItemNotFoundException(1)).Code, "stable code for 404s");
Check.Equal("server_error", ErrorMapper.Map(new Exception("x")).Code, "bugs get the generic code");
```

WHY: `detail` strings are for reading, not `if`-ing — the moment a frontend writes
`if (problem.detail.includes("out of stock"))` you can never reword a message again. A `code` is a
contract you keep stable while prose stays free. RFC 9457 explicitly allows extension members, and
`Results.Problem` serializes them as top-level JSON fields; existing tests keep passing because the
old tuple element *names* still exist.

### 4. Delete

```csharp
// InventoryService.cs
public void Remove(int id)
{
    lock (_lock)
    {
        var item = _items.FirstOrDefault(i => i.Id == id) ?? throw new ItemNotFoundException(id);
        _items.Remove(item);
    }
}

// Program.cs
app.MapDelete("/items/{id}", (int id, InventoryService inv) =>
{
    inv.Remove(id);
    return Results.NoContent();
});
```

WHY: `Remove` returning `void` looks odd after cs#16's `bool Remove` — but this app's convention is
"failure throws", and mixing conventions is worse than either alone. The second DELETE's 404 comes
out dressed exactly like `GET /items/99`'s, because both are the same exception taking the same road
through the same middleware.

### 5. Batch purchase

```csharp
// InventoryService.cs
/// All-or-nothing: either every id is purchasable (duplicates = multiple
/// units) and all stocks drop, or nothing changes and the problem is thrown.
public IReadOnlyList<Item> PurchaseMany(IEnumerable<int> ids)
{
    lock (_lock)
    {
        var wanted = ids.ToList();
        foreach (var group in wanted.GroupBy(id => id))          // validate FIRST...
        {
            var item = _items.FirstOrDefault(i => i.Id == group.Key)
                ?? throw new ItemNotFoundException(group.Key);
            if (item.Stock < group.Count())
                throw new OutOfStockException(item.Name);
        }
        var result = new List<Item>();
        foreach (var id in wanted)                                // ...mutate ONLY after
        {
            var item = _items.First(i => i.Id == id);
            var updated = item with { Stock = item.Stock - 1 };
            _items[_items.IndexOf(item)] = updated;
            result.Add(updated);
        }
        return result;
    }
}

// Program.cs
app.MapPost("/items/purchase-batch", (PurchaseBatch dto, InventoryService inv)
    => Results.Ok(inv.PurchaseMany(dto.Ids ?? new List<int>())));
public record PurchaseBatch(List<int>? Ids);

// Tests.cs
var inv = NewService();
Check.Equal(3, inv.PurchaseMany(new[] { 1, 2, 1 }).Count, "a batch returns every purchase");
Check.Equal(10, inv.Get(1).Stock, "duplicated ids decrement twice");
Check.Throws<OutOfStockException>(() => inv.PurchaseMany(new[] { 2, 3, 3 }), "one bad id sinks the batch");
Check.Equal(39, inv.Get(2).Stock, "and the good id was NOT decremented");
Check.Throws<ItemNotFoundException>(() => inv.PurchaseMany(new[] { 1, 99 }), "missing ids sink it too");
```

WHY: the naive loop-and-purchase would throw halfway and leave item 2 already decremented — a
half-shipped order no one can see in any response. Validate-then-mutate inside one lock is the
in-memory version of a database transaction: the throw happens while the state is still pristine.
`GroupBy` is what catches the sneaky `[3,3]`-against-stock-1 case that a simple per-id existence
check would wave through.
