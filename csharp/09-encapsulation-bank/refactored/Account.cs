// The invariants this class enforces — not hopes, FACTS:
//   1. Balance is never negative (no overdrafts).
//   2. Every balance change leaves a history entry.
//   3. Amounts are always positive (no negative-deposit money printing).
// They're facts because every door into the state runs the checks, and
// there are no other doors.
public class Account
{
    // The ONLY mutable state, and only this class can touch it.
    private readonly List<string> _history = new();

    // Readable by everyone, writable only from inside this class.
    public decimal Balance { get; private set; }

    // A read-only VIEW of the history: callers can look and iterate,
    // but there's no Add, no Clear, no indexer assignment.
    public IReadOnlyList<string> History => _history.AsReadOnly();

    public void Deposit(decimal amount)
    {
        // Bad AMOUNTS are bad arguments -> ArgumentException family.
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), amount, "A deposit must be a positive amount.");

        Balance += amount;
        _history.Add($"deposit {amount}");
    }

    public void Withdraw(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), amount, "A withdrawal must be a positive amount.");

        // A fine amount at a bad TIME (not enough money) -> InvalidOperationException.
        if (amount > Balance)
            throw new InvalidOperationException($"Insufficient funds: balance is {Balance}, tried to withdraw {amount}.");

        Balance -= amount;
        _history.Add($"withdraw {amount}");
    }
}
