# CS 31 — pattern-matching-rules

**Lesson: a rule book written as nested `if`/`else` over `is` checks, `as`
casts and bool flags hides its own precedence. Switch expressions with
property, relational, positional and list patterns put the rules on the page
in the spec's order — where a mis-ordering is something you can SEE.**

## The rule book (this is the spec)

Shipping is the **first** matching rule, top to bottom:

| # | When | Cost | Rule name |
|---|------|------|-----------|
| 1 | the basket is empty | $0.00 | empty order |
| 2 | any line's SKU starts with `OVERSIZE-` | $24.00 | oversize freight |
| 3 | the customer is an employee | $0.00 | employee perk |
| 4 | the customer is a member of 5+ years | $0.00 | loyalty 5+ years |
| 5 | the subtotal is over $50.00 | $0.00 | free over $50 |
| 6 | shipping international | $19.50 | international flat |
| 7 | one line, quantity 1, subtotal ≤ $10.00 | $1.95 | letter rate |
| 8 | anything else | $4.95 | standard parcel |

Discounts: warehouse staff 30%, other staff 20%, members 15% (10+ years),
10% (5+), 5% (1+), everyone else 0%.

## Run it

```
dotnet run csharp/31-pattern-matching-rules/original.cs
dotnet run --project csharp/31-pattern-matching-rules/refactored
dotnet run --project csharp/31-pattern-matching-rules/refactored -- test
```

Both print the same eight orders against the table above. The original gets
two of them wrong; the refactor gets none.

## What's wrong with the original?

1. **The rules are in the wrong order, and nothing says so.** `if (subtotal >
   50m)` is nested above the oversize check, so a $200 pallet ships free and
   the oversize branch is unreachable for every expensive order. No compiler
   warns you that you nested rules wrong — only the shipping bill does.
2. **Facts are computed twenty lines from where they are used.** `bool
   isLoyalMember` comes from `mem.Years > 5`; the spec says five *or more*.
   At the `if (isLoyalMember)` line the boundary is invisible, so a five-year
   member pays $4.95 and the review passes.
3. **`is` + `as` + flags is three ways of asking one question** (test and use
   as separate statements, free to drift), stacked seven levels deep for
   eight rules — so "which rule wins?" needs a pencil to answer.

## What changed in the refactor

- **One switch expression per question**, arms in the table's order. Arms are
  tried top to bottom, so **position is precedence** — now readable,
  reviewable and deliberately reorderable.
- **Property patterns** ask about shape (`{ Lines: [] }`, `{ Subtotal: > 50m }`);
  **positional patterns** deconstruct records (`Member(_, >= 5)` puts the
  boundary on the same line as the decision); **relational patterns** replace
  the comparisons that hid in flag assignments; **list patterns** describe
  the basket (`[{ Quantity: 1 }]`, `[{ IsOversize: true }, ..]`, `[a, .., z]`).
- **Tests prove the order is deliberate**: every rule, every boundary, every
  overlap ("oversize beats the employee perk"), plus a sweep of 84 orders
  checked against an independent priority table read both ways round.

## Key takeaway

Nested `if`s encode precedence in *indentation*, which is exactly where
nobody reads it. A switch expression encodes it in *line order* next to the
condition itself, so "specific rules first, general last" becomes a property
of the page — and your code and your spec table can be read side by side.
