// 06 — Order status workflow, original (flawed) version.
// Statuses are plain strings. Watch what happens to orders A-1002 and A-1003.
// Run from repo root:  dotnet run csharp/06-enums-and-switch/original.cs

using System;
using System.Collections.Generic;

var orders = new List<Order>
{
    new Order("A-1001", "pending"),
    new Order("A-1002", "Paid"),     // typed by hand in the admin tool — capital P
    new Order("A-1003", "SHIPPED"),  // imported from the old system, which SHOUTED
    new Order("A-1004", "delivered"),
};

Console.WriteLine("=== Morning batch: what should we do with each order? ===");
foreach (var order in orders)
{
    Console.WriteLine($"  {order.Id} [{order.Status,-9}] -> {NextStep(order.Status)}");
}

Console.WriteLine();
Console.WriteLine("=== Which orders can still be cancelled? ===");
foreach (var order in orders)
{
    var verdict = CanCancel(order.Status) ? "can cancel" : "too late";
    Console.WriteLine($"  {order.Id} [{order.Status,-9}] -> {verdict}");
}

Console.WriteLine();
Console.WriteLine("Look at A-1002: it IS paid, but no shipping label will be printed —");
Console.WriteLine("\"Paid\" != \"paid\", so it fell into the ??? bucket without any error.");
Console.WriteLine("A-1003 is worse: it already SHIPPED, yet we just told the customer");
Console.WriteLine("they can still cancel — \"SHIPPED\" never matches \"shipped\", and the");
Console.WriteLine("chain's final else treats every stranger as 'early in the flow'.");
Console.WriteLine();
Console.WriteLine("And adding a new status (say \"refunded\") means hunting down EVERY");
Console.WriteLine("if/else chain in the codebase that switches on these strings — the");
Console.WriteLine("compiler won't tell you when you miss one.");

// What should we do next for this order?
string NextStep(string status)
{
    if (status == "pending") return "send payment reminder";
    else if (status == "paid") return "print shipping label";
    else if (status == "shipped") return "email tracking number";
    else if (status == "delivered") return "ask for a review";
    else return "??? unknown status — doing nothing";  // where typos go to hide
}

// Cancellation policy: allowed until the parcel leaves the warehouse.
bool CanCancel(string status)
{
    if (status == "shipped") return false;
    else if (status == "delivered") return false;
    else return true;  // "anything else must be early in the flow"... right?
}

class Order
{
    public string Id;
    public string Status;  // any string at all: "paid", "Paid", "PAYED", "banana"...

    public Order(string id, string status)
    {
        Id = id;
        Status = status;
    }
}
