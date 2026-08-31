// ONE table that decides, for the entire app, which exception becomes which
// HTTP status. Pure function: exception in, (status, title, detail) out —
// which is exactly what makes it testable without HTTP (see Tests.cs).
//
// Note the last arm: an exception we did NOT expect is a bug, so the client
// gets a generic 500 and the real message stays on the server. Leaking raw
// internals ("NullReferenceException at Db.cs line 214") to strangers is a
// security hole, not transparency.

public static class ErrorMapper
{
    public static (int Status, string Title, string Detail) Map(Exception ex) => ex switch
    {
        ItemNotFoundException e    => (404, "Item not found", e.Message),
        UnknownCategoryException e => (400, "Unknown category", e.Message),
        OutOfStockException e      => (409, "Out of stock", e.Message),
        ArgumentException e        => (400, "Invalid input", e.Message),
        _                          => (500, "Unexpected server error",
                                       "Something went wrong on our side. The details were logged."),
    };
}
