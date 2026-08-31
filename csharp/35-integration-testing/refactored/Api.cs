// THE COMPOSITION ROOT, extracted into a function.
//
// This one refactor is what makes integration testing possible at all. In
// every other project in this track, Program.cs both *builds* the app and
// *runs* it, in the same breath — so there is no way for a test to get hold of
// a configured app without also starting a server on the real port.
//
// Splitting "build" from "run" gives two callers the same app:
//
//   Program.cs   builds it, then runs it on http://localhost:5035
//   HttpTests.cs builds it, then runs it on port 0 (a random free port), makes
//                real HTTP requests against it, and stops it again
//
// The tests exercise the app the app, not a copy of it — same endpoints, same
// DI registrations, same JSON serialization, same middleware. If this function
// changes, both callers change with it, which is the property that makes the
// test suite trustworthy a year from now.

public static class Api
{
    public static WebApplication Build(string[] args, bool quiet = false)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Tests silence the logger so the Check output stays readable. The real
        // run keeps it, because "Now listening on..." is useful information.
        if (quiet) builder.Logging.ClearProviders();

        builder.Services.AddSingleton<OrderStore>();

        var app = builder.Build();
        MapEndpoints(app);
        return app;
    }

    // Every endpoint here is pure translation: parse, delegate, pick a status
    // code. There is no arithmetic and no business rule — those live in
    // Totals and OrderRules, where unit tests can reach them without HTTP.
    // What is LEFT here is exactly what only an integration test can check.
    private static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/orders", (OrderStore store) => Results.Ok(store.All()));

        // `{id:int}` is a route CONSTRAINT: /orders/abc does not match this
        // route at all, so it is a 404 (that URL names no resource) rather
        // than a 400. Without the constraint it would be a binding failure —
        // also fine, also a deliberate choice. The point is that it IS a
        // choice, and a test should pin whichever one you made.
        app.MapGet("/orders/{id:int}", (int id, OrderStore store) =>
            store.Find(id) is { } order
                ? Results.Ok(order)
                : Results.NotFound(new { error = $"no order with id {id}" }));   // the original's 200-with-null

        app.MapPost("/orders", (NewOrder? dto, OrderStore store) =>
        {
            var errors = OrderRules.Validate(dto);
            if (errors.Count > 0) return Results.BadRequest(new { errors });

            var order = store.Add(OrderRules.ToLines(dto!));

            // 201 + Location: the status says "I made something", the header
            // says where it lives (cs#16). A client no longer has to build the
            // URL from an id and hope it guessed the route right.
            return Results.Created($"/orders/{order.Id}", order);
        });

        app.MapDelete("/orders/{id:int}", (int id, OrderStore store) =>
            store.Delete(id)
                ? Results.NoContent()
                : Results.NotFound(new { error = $"no order with id {id}" }));
    }
}
