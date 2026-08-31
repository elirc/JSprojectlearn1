// 09 — Bank account, original (flawed) version.
// The data is public, so the rules are just wishes. Watch a few perfectly
// legal lines corrupt an account beyond repair.
// Run from repo root:  dotnet run csharp/09-encapsulation-bank/original.cs

using System;
using System.Collections.Generic;

var account = new Account();
account.Deposit(500m);
account.Withdraw(120m);

Console.WriteLine("=== Used politely, everything looks fine ===");
PrintAccount(account);

Console.WriteLine();
Console.WriteLine("=== Now four perfectly legal lines ===");
Console.WriteLine();

// 1) A "helpful" refund function a teammate wrote — it writes the field
//    directly, so the money appears but the audit trail doesn't.
GiveRefund(account, 30m);
Console.WriteLine($"1) GiveRefund(30):        balance {account.Balance} but still only {account.History.Count} history entries");
Console.WriteLine("   -> the refund left NO TRACE. Balance and history now disagree.");

// 2) Withdraw a NEGATIVE amount: the guard only checks "amount > Balance",
//    so subtracting -1000 quietly ADDS money.
account.Withdraw(-1000m);
Console.WriteLine($"2) Withdraw(-1000):       balance {account.Balance} (withdrawing negative money PRINTS money)");

// 3) Anyone can just set the balance. To anything.
account.Balance = -5000m;
Console.WriteLine($"3) Balance = -5000:       balance {account.Balance} (an account that owes itself?)");

// 4) Anyone can shred the audit log.
account.History.Clear();
Console.WriteLine($"4) History.Clear():       {account.History.Count} history entries — the audit trail is gone");

Console.WriteLine();
Console.WriteLine("Deposit/Withdraw contain the rules — but the fields are public, so");
Console.WriteLine("nothing forces anyone through them. \"Balance always matches history\"");
Console.WriteLine("isn't a property of this class; it's a hope about every caller, forever.");

static void GiveRefund(Account acct, decimal amount)
{
    acct.Balance += amount;  // oops: skipped the history. Compiles fine.
}

static void PrintAccount(Account acct)
{
    Console.WriteLine($"  balance: {acct.Balance}");
    foreach (var entry in acct.History)
    {
        Console.WriteLine($"  history: {entry}");
    }
}

class Account
{
    public decimal Balance;               // anyone can write this
    public List<string> History = new();  // anyone can clear/replace this

    public void Deposit(decimal amount)
    {
        Balance += amount;
        History.Add($"deposit {amount}");
    }

    public void Withdraw(decimal amount)
    {
        if (amount > Balance)
        {
            Console.WriteLine("  (declined: insufficient funds)");
            return;
        }
        Balance -= amount;
        History.Add($"withdraw {amount}");
    }
}
