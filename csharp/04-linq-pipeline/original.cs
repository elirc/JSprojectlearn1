// Sales report over a hard-coded list — every question answered with nested
// loops, temp lists, and flag variables.
// Run from the repo root:
//   dotnet run csharp/04-linq-pipeline/original.cs
//
// The numbers are right. But each question took ~15 lines of loop plumbing,
// none of it is testable, and the third block quietly duplicates the first's
// "have I already handled this one?" trick. This is js#36 (log-analyzer)
// energy, in C#.

var sales = new List<Sale>
{
    new Sale("Keyboard", "North", 90m),
    new Sale("Keyboard", "South", 120m),
    new Sale("Mouse",    "North", 40m),
    new Sale("Mouse",    "South", 55m),
    new Sale("Monitor",  "North", 250m),
    new Sale("Monitor",  "West",  300m),
    new Sale("Webcam",   "West",  80m),
    new Sale("Keyboard", "West",  110m),
};

// ---- Question 1: total per region -------------------------------------
// Parallel lists again (see project 03) — names in one, totals in the other.
var regionNames = new List<string>();
var regionTotals = new List<decimal>();
foreach (var sale in sales)
{
    bool found = false;
    for (int i = 0; i < regionNames.Count; i++)
    {
        if (regionNames[i] == sale.Region)
        {
            regionTotals[i] = regionTotals[i] + sale.Amount;
            found = true;
            break;
        }
    }
    if (!found)
    {
        regionNames.Add(sale.Region);
        regionTotals.Add(sale.Amount);
    }
}
Console.WriteLine("total per region:");
for (int i = 0; i < regionNames.Count; i++)
{
    Console.WriteLine($"  {regionNames[i]}: {regionTotals[i]:0.00}");
}

// ---- Question 2: top product by revenue --------------------------------
// For each sale, re-sum EVERY sale of the same product (nested loop),
// track the best with flag variables, and keep a "done" list so we don't
// process a product twice.
string topProduct = "";
decimal topRevenue = -1m;
var alreadyDone = new List<string>();
foreach (var sale in sales)
{
    bool done = false;
    foreach (var name in alreadyDone)
    {
        if (name == sale.Product) { done = true; break; }
    }
    if (done) continue;
    alreadyDone.Add(sale.Product);

    decimal revenue = 0m;
    foreach (var other in sales)
    {
        if (other.Product == sale.Product)
        {
            revenue = revenue + other.Amount;
        }
    }
    if (revenue > topRevenue)
    {
        topRevenue = revenue;
        topProduct = sale.Product;
    }
}
Console.WriteLine($"top product: {topProduct} ({topRevenue:0.00})");

// ---- Question 3: average of the big sales (over 100) -------------------
decimal bigSum = 0m;
int bigCount = 0;
foreach (var sale in sales)
{
    if (sale.Amount > 100m)
    {
        bigSum = bigSum + sale.Amount;
        bigCount = bigCount + 1;
    }
}
if (bigCount > 0)
{
    Console.WriteLine($"average of sales over 100: {bigSum / bigCount:0.00}");
}
else
{
    Console.WriteLine("average of sales over 100: (none)");
}

class Sale
{
    public string Product;
    public string Region;
    public decimal Amount;

    public Sale(string product, string region, decimal amount)
    {
        Product = product;
        Region = region;
        Amount = amount;
    }
}
