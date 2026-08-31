// Board is where all the rules live, so Board is where all the tests aim.
// Every test here would have been a 500 error, a duplicated card, or a
// silently wrong board in the original.
public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("Board");
        ColumnRules();
        AddCardRules();
        MoveBetweenColumns();
        MoveWithinColumn();
        PositionClamping();
        UnknownIdsAreErrorsNotCrashes();
        NoDuplicatesEver();
        return Check.Summary();
    }

    static Board Sample()
    {
        var board = new Board();
        board.AddColumn("todo");
        board.AddColumn("doing");
        board.AddColumn("done");
        return board;
    }

    static string Titles(Column column) =>
        string.Join(",", column.Cards.Select(c => c.Title));

    static void ColumnRules()
    {
        var board = new Board();
        var ok = board.AddColumn("  todo  ");
        Check.Equal(true, ok.Ok, "adding a column works");
        Check.Equal("todo", ok.Value!.Name, "column names are trimmed");

        var blank = board.AddColumn("   ");
        Check.Equal(false, blank.Ok, "blank column names are refused");
        Check.Equal("invalid_name", blank.Error!.Code, "with a machine-readable code");

        var dupe = board.AddColumn("TODO");
        Check.Equal(false, dupe.Ok, "duplicate names are refused, case-insensitively");
        Check.Equal("duplicate_column", dupe.Error!.Code, "with their own code");
        Check.Equal(1, board.Columns.Count, "failed adds leave the board unchanged");
    }

    static void AddCardRules()
    {
        var board = Sample();
        var first = board.AddCard("todo", "  write tests  ");
        var second = board.AddCard("todo", "ship it");
        Check.Equal(true, first.Ok, "adding a card works");
        Check.Equal("write tests", first.Value!.Title, "titles are trimmed");
        Check.Equal("write tests,ship it", Titles(board.Columns[0]), "new cards join at the end");

        var noColumn = board.AddCard("someday", "dream big");
        Check.Equal("column_not_found", noColumn.Error!.Code, "unknown column is an error, not a crash");

        var noTitle = board.AddCard("todo", "   ");
        Check.Equal("invalid_title", noTitle.Error!.Code, "blank titles are refused");
        Check.Equal(2, board.Columns[0].Cards.Count, "failed adds add nothing");
    }

    static void MoveBetweenColumns()
    {
        var board = Sample();
        var a = board.AddCard("todo", "a").Value!;
        board.AddCard("todo", "b");
        board.AddCard("doing", "x");

        var moved = board.MoveCard(a.Id, "doing", 0);
        Check.Equal(true, moved.Ok, "moving to another column works");
        Check.Equal(a.Id, moved.Value!.Id, "the same card comes back (same Guid)");
        Check.Equal("b", Titles(board.Columns[0]), "the card left its old column");
        Check.Equal("a,x", Titles(board.Columns[1]), "and landed at the requested position");

        board.MoveCard(a.Id, "done", 999);
        Check.Equal("a", Titles(board.Columns[2]), "a second move keeps working");
        Check.Equal("x", Titles(board.Columns[1]), "and cleans up behind itself");
    }

    static void MoveWithinColumn()
    {
        var board = Sample();
        var a = board.AddCard("todo", "a").Value!;
        board.AddCard("todo", "b");
        var c = board.AddCard("todo", "c").Value!;

        // Moving DOWN in your own column — the exact move that duplicated
        // cards in the original.
        var down = board.MoveCard(a.Id, "todo", 2);
        Check.Equal(true, down.Ok, "moving down inside a column works");
        Check.Equal("b,c,a", Titles(board.Columns[0]), "the order is right (remove first, then insert)");
        Check.Equal(3, board.Columns[0].Cards.Count, "and the card was NOT duplicated");

        var up = board.MoveCard(c.Id, "todo", 0);
        Check.Equal(true, up.Ok, "moving up works too");
        Check.Equal("c,b,a", Titles(board.Columns[0]), "cards above shift down to make room");

        board.MoveCard(c.Id, "todo", 0);
        Check.Equal("c,b,a", Titles(board.Columns[0]), "moving to your own position is a clean no-op");
    }

    static void PositionClamping()
    {
        var board = Sample();
        board.AddCard("todo", "a");
        var b = board.AddCard("todo", "b").Value!;

        var low = board.MoveCard(b.Id, "todo", -5);
        Check.Equal(true, low.Ok, "a negative position doesn't crash (the original threw)");
        Check.Equal("b,a", Titles(board.Columns[0]), "it clamps to the top");

        var high = board.MoveCard(b.Id, "doing", 999);
        Check.Equal(true, high.Ok, "a huge position doesn't crash either");
        Check.Equal("b", Titles(board.Columns[1]), "it clamps to the end");
    }

    static void UnknownIdsAreErrorsNotCrashes()
    {
        var board = Sample();
        var card = board.AddCard("todo", "real").Value!;

        var ghostCard = board.MoveCard(Guid.NewGuid(), "doing", 0);
        Check.Equal(false, ghostCard.Ok, "moving a card that doesn't exist fails politely");
        Check.Equal("card_not_found", ghostCard.Error!.Code, "with the not-found code");

        var ghostColumn = board.MoveCard(card.Id, "limbo", 0);
        Check.Equal("column_not_found", ghostColumn.Error!.Code, "unknown destination fails politely too");
        Check.Equal("real", Titles(board.Columns[0]), "failed moves leave the board untouched");
    }

    static void NoDuplicatesEver()
    {
        var board = Sample();
        var a = board.AddCard("todo", "a").Value!;
        board.AddCard("todo", "b");

        // Shuffle hard, then audit: every id on the board exactly once.
        board.MoveCard(a.Id, "todo", 1);
        board.MoveCard(a.Id, "doing", 0);
        board.MoveCard(a.Id, "todo", 0);
        var allIds = board.Columns.SelectMany(c => c.Cards).Select(c => c.Id).ToList();
        Check.Equal(2, allIds.Count, "no move ever changes the number of cards");
        Check.Equal(2, allIds.Distinct().Count(), "and every card id appears exactly once");

        // The Column invariant is the last line of defense: putting the same
        // card into a column twice is impossible by construction.
        var column = new Column("x");
        var card = new Card(Guid.NewGuid(), "twin");
        column.Insert(0, card);
        Check.Throws<InvalidOperationException>(() => column.Insert(1, card),
            "Column refuses a duplicate card id outright");
    }
}
