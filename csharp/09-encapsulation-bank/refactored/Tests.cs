public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("The happy path still works:");
        var account = new Account();
        account.Deposit(500m);
        Check.Equal(500m, account.Balance, "deposit adds to the balance");
        account.Withdraw(120m);
        Check.Equal(380m, account.Balance, "withdraw subtracts from the balance");

        Console.WriteLine("Invariant: every change leaves a history entry:");
        Check.Equal(2, account.History.Count, "two operations -> two entries");
        Check.Equal("deposit 500", account.History[0], "first entry records the deposit");
        Check.Equal("withdraw 120", account.History[1], "second entry records the withdrawal");

        Console.WriteLine("Invariant: amounts must be positive (bad ARGUMENTS throw):");
        Check.Throws<ArgumentOutOfRangeException>(() => account.Deposit(0m), "Deposit(0) is rejected");
        Check.Throws<ArgumentOutOfRangeException>(() => account.Deposit(-50m), "Deposit(-50) is rejected");
        Check.Throws<ArgumentOutOfRangeException>(() => account.Withdraw(-1000m), "Withdraw(-1000) can't print money");

        Console.WriteLine("Invariant: no overdrafts (bad TIMING throws):");
        Check.Throws<InvalidOperationException>(() => account.Withdraw(999_999m), "overdraft is rejected");
        Check.Equal(380m, account.Balance, "failed operations change NOTHING");
        Check.Equal(2, account.History.Count, "failed operations log NOTHING");

        Console.WriteLine("Withdrawing the exact balance is legal (boundary):");
        var drainable = new Account();
        drainable.Deposit(100m);
        drainable.Withdraw(100m);
        Check.Equal(0m, drainable.Balance, "balance can reach exactly zero");

        Console.WriteLine("The history is a read-only view:");
        Check.True(account.History is not List<string>, "History is not the raw List (no Add/Clear to call)");
        Check.Equal(2, account.History.Count, "the view still reads the real data");

        Console.WriteLine("A fresh account starts consistent:");
        var fresh = new Account();
        Check.Equal(0m, fresh.Balance, "new account has zero balance");
        Check.Equal(0, fresh.History.Count, "new account has empty history");

        return Check.Summary();
    }
}
