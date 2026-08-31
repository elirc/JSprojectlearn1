// Domain exceptions: one class per EXPECTED failure. The type itself carries
// the meaning ("this item doesn't exist"), so the HTTP layer can map type ->
// status code without ever parsing message strings. Compare project 08, where
// a Result type played this role for a console app — exceptions + one mapping
// middleware is the idiomatic ASP.NET Core version of the same separation.

public class ItemNotFoundException : Exception
{
    public ItemNotFoundException(int id) : base($"no item with id {id}") { }
}

public class OutOfStockException : Exception
{
    public OutOfStockException(string itemName) : base($"'{itemName}' is out of stock") { }
}

public class UnknownCategoryException : Exception
{
    public UnknownCategoryException(string category)
        : base($"unknown category '{category}' (known: {string.Join(", ", InventoryService.KnownCategories)})") { }
}
