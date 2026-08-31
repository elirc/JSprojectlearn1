// The cs#21 pattern: endpoints depend on this interface, not on where the
// board actually lives. Today it's a field in memory; a JSON-file or
// database version slots in behind the same two methods and no endpoint
// ever finds out.
public interface IBoardRepository
{
    Board Load();
    void Save(Board board);
}

public sealed class InMemoryBoardRepository : IBoardRepository
{
    private Board board;

    public InMemoryBoardRepository(Board seed)
    {
        board = seed;
    }

    public Board Load() => board;

    // A no-op for memory — but every endpoint calls it anyway, so switching
    // to real persistence later is a one-file change, not a treasure hunt.
    public void Save(Board updated) => board = updated;
}
