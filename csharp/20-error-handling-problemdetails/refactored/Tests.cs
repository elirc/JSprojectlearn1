public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("ErrorMapper: exception type -> HTTP status (the whole point of this project)");
        Check.Equal(404, ErrorMapper.Map(new ItemNotFoundException(7)).Status, "ItemNotFoundException -> 404");
        Check.Equal(400, ErrorMapper.Map(new UnknownCategoryException("typo")).Status, "UnknownCategoryException -> 400");
        Check.Equal(409, ErrorMapper.Map(new OutOfStockException("Webcam")).Status, "OutOfStockException -> 409");
        Check.Equal(400, ErrorMapper.Map(new ArgumentException("bad")).Status, "ArgumentException -> 400");
        Check.Equal(500, ErrorMapper.Map(new InvalidOperationException("bug")).Status, "anything unexpected -> 500");

        Console.WriteLine("ErrorMapper: expected failures explain themselves, bugs stay private");
        Check.Equal("no item with id 7", ErrorMapper.Map(new ItemNotFoundException(7)).Detail,
            "expected failure keeps its message as the detail");
        var secretBug = new InvalidOperationException("password=hunter2 leaked in stack trace");
        Check.True(!ErrorMapper.Map(secretBug).Detail.Contains("hunter2"),
            "unexpected failure does NOT leak the internal message");
        Check.Equal("Unexpected server error", ErrorMapper.Map(secretBug).Title,
            "unexpected failure gets a generic title");

        Console.WriteLine("InventoryService: lookups");
        var inv = NewService();
        Check.Equal(3, inv.GetAll().Count, "seed data has 3 items");
        Check.Equal("Webcam", inv.Get(3).Name, "Get finds an existing item");
        Check.Throws<ItemNotFoundException>(() => inv.Get(99), "Get on a missing id throws ItemNotFoundException");

        Console.WriteLine("InventoryService: by-category (the swallowed-exception bug, fixed)");
        Check.Equal(2, inv.ByCategory("electronics").Count, "known category returns its items");
        Check.Equal(0, inv.ByCategory("furniture").Count, "known-but-empty category returns [] (a REAL empty list)");
        Check.Throws<UnknownCategoryException>(() => inv.ByCategory("electronixs"),
            "typo'd category THROWS instead of faking an empty success");

        Console.WriteLine("InventoryService: purchase");
        inv = NewService();
        Check.Equal(11, inv.Purchase(1).Stock, "purchase decrements stock");
        Check.Equal(0, inv.Purchase(3).Stock, "last unit can be purchased");
        Check.Throws<OutOfStockException>(() => inv.Purchase(3), "purchasing at 0 stock throws OutOfStockException");
        Check.Throws<ItemNotFoundException>(() => inv.Purchase(99), "purchasing a missing item throws ItemNotFoundException");

        Console.WriteLine("InventoryService: add");
        inv = NewService();
        var added = inv.Add("  Desk Lamp  ", "furniture", 5);
        Check.Equal(4, added.Id, "new item gets the next id");
        Check.Equal("Desk Lamp", added.Name, "name is trimmed");
        Check.Equal(4, inv.GetAll().Count, "added item is stored");
        Check.Throws<ArgumentException>(() => inv.Add("   ", "paper", 1), "blank name throws ArgumentException");
        Check.Throws<ArgumentException>(() => inv.Add("Pen", "paper", -1), "negative stock throws ArgumentException");
        Check.Throws<UnknownCategoryException>(() => inv.Add("Pen", "papyrus", 1),
            "unknown category on add throws UnknownCategoryException");

        return Check.Summary();
    }

    private static InventoryService NewService() => new(new List<Item>
    {
        new(1, "Keyboard", "electronics", 12),
        new(2, "Notebook", "paper",       40),
        new(3, "Webcam",   "electronics",  1),
    });
}
