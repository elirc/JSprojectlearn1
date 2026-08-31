public static class Tests
{
    static readonly List<Sale> Sample = new()
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

    static readonly List<Sale> Empty = new();

    public static int Run()
    {
        Console.WriteLine("TotalByRegion");
        var totals = SalesReport.TotalByRegion(Sample);
        Check.Equal(3, totals.Count, "3 regions in the sample");
        Check.Equal(380m, totals["North"], "North: 90 + 40 + 250");
        Check.Equal(175m, totals["South"], "South: 120 + 55");
        Check.Equal(490m, totals["West"], "West: 300 + 80 + 110");
        Check.Equal(0, SalesReport.TotalByRegion(Empty).Count, "no sales -> empty table (not a crash)");

        Console.WriteLine("TopProduct");
        Check.Equal("Monitor", SalesReport.TopProduct(Sample), "Monitor wins: 550 total revenue");
        Check.Equal("Solo", SalesReport.TopProduct(new List<Sale> { new("Solo", "X", 1m) }),
            "single sale -> that product");
        Check.Throws<InvalidOperationException>(() => SalesReport.TopProduct(Empty),
            "no sales -> throws (there is no top product)");

        Console.WriteLine("AverageOver");
        Check.Equal(195m, SalesReport.AverageOver(Sample, 100m), "(120 + 250 + 300 + 110) / 4");
        Check.Equal(0m, SalesReport.AverageOver(Sample, 1000m), "nothing qualifies -> 0, not a crash");
        Check.Equal(0m, SalesReport.AverageOver(Empty, 0m), "empty list -> 0");
        Check.Equal(130.625m, SalesReport.AverageOver(Sample, 0m), "threshold 0 averages everything");

        Console.WriteLine("ProductsIn");
        var west = SalesReport.ProductsIn(Sample, "West");
        Check.Equal(3, west.Count, "3 distinct products sold in West");
        Check.Equal("Keyboard", west[0], "sorted A->Z: Keyboard first");
        Check.Equal("Webcam", west[2], "sorted A->Z: Webcam last");
        Check.Equal(0, SalesReport.ProductsIn(Sample, "Nowhere").Count, "unknown region -> empty list");

        return Check.Summary();
    }
}
