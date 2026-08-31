#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

// (That second line just silences native-AOT trimming warnings that
// file-based web apps emit for reflection-based JSON — ignore it.)
//
// 35 — integration testing (ORIGINAL, flawed on purpose)
//
// A small orders API with ZERO tests. Not "a few tests". Zero. It was written
// in an afternoon, it demoed fine, and it has been in production for a year.
//
// It also has a BUG CHAIN — three faults that each look survivable alone and
// combine into "the invoice totals are wrong and the app says everything is
// fine". Every one of them is invisible to the unit tests nobody wrote, and
// two of them are invisible to unit tests even if you DO write them, because
// they live in the space between the code and HTTP.
//
// Run:   dotnet run csharp/35-integration-testing/original.cs
// Try:
//   curl -X POST http://localhost:5035/orders -H "Content-Type: application/json" \
//        -d "{\"lines\":[{\"sku\":\"BOOK-1\",\"qty\":3,\"unitPrice\":19.99}]}"
//
//   BUG #1 — the money is wrong, and it is wrong in an ugly way:
//        subtotal 59.97, tax 4.7976, total 64.7676
//        Nobody's invoice says 64.7676. Round it for display and you get
//        59.97 + 4.80 = 64.77, but the server said 64.77 too... sometimes.
//        Watch what happens with qty 1 at 24.995 — doubles and Math.Round's
//        banker's rounding disagree with every accountant alive.
//
//   BUG #2 — a missing order is a SUCCESS:
//   curl -i http://localhost:5035/orders/999
//        -> HTTP/1.1 200 OK
//        -> null
//        The client asked for an order that does not exist and was told
//        "here you go". Every `if (res.ok)` on the planet takes the happy path
//        and then explodes on `order.total` — in the CLIENT, three files away
//        from the actual mistake.
//
//   BUG #3 — creating something returns 200, not 201, and no Location:
//   curl -i -X POST http://localhost:5035/orders -H "Content-Type: application/json" \
//        -d "{\"lines\":[{\"sku\":\"MUG-1\",\"qty\":1,\"unitPrice\":9.5}]}"
//        -> HTTP/1.1 200 OK, and no Location header telling you where it went.
//
// Read the three bugs again and ask project 01's question: HOW WOULD I TEST
// THIS? Bug #1 needs a test of the arithmetic. Bugs #2 and #3 are about status
// codes and headers — there is no function you could call to check them,
// because the mistake IS the HTTP translation. That gap is what project 35 is
// about.

var app = WebApplication.CreateBuilder(args).Build();

var orders = new List<Order>();
var nextId = 1;

app.MapPost("/orders", (NewOrder dto) =>
{
    if (dto.Lines is null || dto.Lines.Count == 0)
        return Results.BadRequest("an order needs at least one line");

    // BUG #1, part one: money in `double`. Doubles are binary fractions, and
    // 0.1 is no more representable in binary than 1/3 is in decimal — so
    // 19.99 is actually 19.989999999999998436805981327. Multiply, add, and
    // the error compounds. This is why every currency value in every serious
    // system is a decimal (or an integer number of cents), never a double.
    double subtotal = 0;
    foreach (var line in dto.Lines)
        subtotal += line.Qty * line.UnitPrice;

    double tax = subtotal * 0.08;

    // BUG #1, part two: the pieces and the whole are rounded INCONSISTENTLY.
    // The total is rounded; subtotal and tax are not. So the response can say
    // 59.97 + 4.7976 = 64.77, which is three numbers that do not add up, and
    // whichever one the client trusts, some other screen disagrees.
    //
    // BUG #1, part three: Math.Round uses BANKER'S ROUNDING by default —
    // 2.675 rounds to 2.68 but 2.665 rounds to 2.66, because it rounds ties
    // to the nearest EVEN digit. It is a defensible statistical choice and it
    // is not what invoices do. Nobody wrote MidpointRounding.AwayFromZero
    // because nobody knew there was a choice.
    double total = Math.Round(subtotal + tax, 2);

    var order = new Order(nextId++, dto.Lines, subtotal, tax, total);
    orders.Add(order);

    // BUG #3: 200 OK for something that CREATED a resource, and no Location
    // header. REST says 201 Created + Location (cs#16). A client that wants
    // the new order's URL has to build it from the id and hope.
    return Results.Ok(order);
});

app.MapGet("/orders/{id}", (int id) =>
{
    var order = orders.FirstOrDefault(o => o.Id == id);

    // BUG #2: `order` is null when nothing matched, and Results.Ok(null)
    // is a perfectly cheerful 200 with the body `null`. The one line that
    // would fix it — `if (order is null) return Results.NotFound();` — was
    // never written, and no test could have missed it, because there are no
    // tests.
    return Results.Ok(order);
});

app.MapGet("/orders", () => Results.Ok(orders));

app.Run("http://localhost:5035");

record OrderLine(string Sku, int Qty, double UnitPrice);
record NewOrder(List<OrderLine>? Lines);
record Order(int Id, List<OrderLine> Lines, double Subtotal, double Tax, double Total);
