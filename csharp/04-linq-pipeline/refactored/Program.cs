if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Same data, same three questions as original.cs — the demo only prints.
var sales = new List<Sale>
{
    new("Keyboard", "North", 90m),
    new("Keyboard", "South", 120m),
    new("Mouse",    "North", 40m),
    new("Mouse",    "South", 55m),
    new("Monitor",  "North", 250m),
    new("Monitor",  "West",  300m),
    new("Webcam",   "West",  80m),
    new("Keyboard", "West",  110m),
};

Console.WriteLine("total per region:");
foreach (var (region, total) in SalesReport.TotalByRegion(sales))
{
    Console.WriteLine($"  {region}: {total:0.00}");
}

Console.WriteLine($"top product: {SalesReport.TopProduct(sales)}");
Console.WriteLine($"average of sales over 100: {SalesReport.AverageOver(sales, 100m):0.00}");
Console.WriteLine($"products sold in West: {string.Join(", ", SalesReport.ProductsIn(sales, "West"))}");
