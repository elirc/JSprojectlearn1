// The domain. Compare each piece to the original's Dictionary blobs:
//   Card    — a record: an id and a title, impossible to half-construct (cs#07)
//   Column  — a name plus an ORDERED card list that protects its own
//             invariant: no duplicate card ids, positions always clamped (cs#09)
//   Board   — the only public door. Every mutation validates first and
//             reports failures as Results, never as 500s (cs#08)

public sealed record Card(Guid Id, string Title);

public sealed class Column
{
    private readonly List<Card> cards = new();

    public string Name { get; }
    public IReadOnlyList<Card> Cards => cards;

    public Column(string name)
    {
        Name = name;
    }

    // internal: only Board (and the tests) may rearrange cards directly.
    internal void Insert(int position, Card card)
    {
        if (cards.Any(c => c.Id == card.Id))
            throw new InvalidOperationException(
                $"Column '{Name}' already contains card {card.Id} — a card can't be in one column twice.");
        cards.Insert(Math.Clamp(position, 0, cards.Count), card);
    }

    internal bool Remove(Guid cardId) => cards.RemoveAll(c => c.Id == cardId) > 0;

    internal int IndexOf(Guid cardId) => cards.FindIndex(c => c.Id == cardId);
}

public sealed class Board
{
    private readonly List<Column> columns = new();

    public IReadOnlyList<Column> Columns => columns;

    public Result<Column> AddColumn(string? name)
    {
        var trimmed = (name ?? "").Trim();
        if (trimmed.Length == 0)
            return Result<Column>.Fail("invalid_name", "Column name cannot be blank.");
        if (Find(trimmed) is not null)
            return Result<Column>.Fail("duplicate_column", $"A column named '{trimmed}' already exists.");
        var column = new Column(trimmed);
        columns.Add(column);
        return Result<Column>.Success(column);
    }

    public Result<Card> AddCard(string? columnName, string? title)
    {
        var column = Find(columnName);
        if (column is null)
            return Result<Card>.Fail("column_not_found", $"No column named '{columnName}'.");
        var trimmed = (title ?? "").Trim();
        if (trimmed.Length == 0)
            return Result<Card>.Fail("invalid_title", "Card title cannot be blank.");
        var card = new Card(Guid.NewGuid(), trimmed);
        column.Insert(column.Cards.Count, card);   // new cards join at the end
        return Result<Card>.Success(card);
    }

    public Result<Card> MoveCard(Guid cardId, string? toColumnName, int position)
    {
        var to = Find(toColumnName);
        if (to is null)
            return Result<Card>.Fail("column_not_found", $"No column named '{toColumnName}'.");

        Column? from = null;
        Card? card = null;
        foreach (var column in columns)
        {
            var index = column.IndexOf(cardId);
            if (index >= 0)
            {
                from = column;
                card = column.Cards[index];
                break;
            }
        }
        if (card is null || from is null)
            return Result<Card>.Fail("card_not_found", $"No card with id {cardId}.");

        // Remove FIRST, then insert — the order the original got backwards.
        // With the card out of the list, `position` means what the caller
        // thinks it means, and Insert's duplicate check can never trip.
        from.Remove(cardId);
        to.Insert(position, card);   // Insert clamps wild positions for us
        return Result<Card>.Success(card);
    }

    private Column? Find(string? name) =>
        columns.FirstOrDefault(c =>
            string.Equals(c.Name, (name ?? "").Trim(), StringComparison.OrdinalIgnoreCase));
}
