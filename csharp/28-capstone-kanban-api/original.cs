#:sdk Microsoft.NET.Sdk.Web
// Kanban — the finale, written the way page one of this track would have.
//
// Run from the repo root:
//   dotnet run csharp/28-capstone-kanban-api/original.cs
// then open http://localhost:5028 in a browser.
//
// The whole board is nested Dictionary<string, object> blobs, so every read
// is a cast and a prayer. There is no validation anywhere: empty titles
// become cards, unknown columns crash with a 500, and a position that's too
// big crashes too. Best of all, try moving a card to a new spot in its OWN
// column: you get TWO of it. Read /move-card closely to see why.

var board = new List<Dictionary<string, object>>();
var nextCardId = 1;

foreach (var name in new[] { "todo", "doing", "done" })
    board.Add(new Dictionary<string, object>
    {
        ["name"] = name,
        ["cards"] = new List<Dictionary<string, object>>(),
    });

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// ---- the page ------------------------------------------------------------

app.MapGet("/", () =>
{
    var columnsHtml = "";
    var options = "";
    foreach (var col in board)
        options += $"<option>{(string)col["name"]}</option>";

    foreach (var col in board)
    {
        var colName = (string)col["name"];
        var cards = (List<Dictionary<string, object>>)col["cards"];   // cast #1
        var cardsHtml = "";
        foreach (var card in cards)
        {
            cardsHtml += "<div style='border:1px solid #aaa;margin:4px;padding:4px'>"
                + (string)card["title"]                                // cast #2, unescaped
                + "<form method='post' action='/move-card'>"
                + $"<input type='hidden' name='id' value='{(int)card["id"]}'>"
                + $"<select name='to'>{options}</select>"
                + " pos <input name='pos' value='0' size='2'>"
                + "<button>Move</button></form></div>";
        }
        columnsHtml += "<td valign='top' width='220'>"
            + $"<h3>{colName} ({cards.Count})</h3>"
            + cardsHtml
            + "<form method='post' action='/add-card'>"
            + $"<input type='hidden' name='col' value='{colName}'>"
            + "<input name='title' placeholder='new card'>"
            + "<button>Add</button></form></td>";
    }

    var html = $$"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Kanban (original)</title></head>
        <body>
          <h1>Kanban</h1>
          <table border="0"><tr>{{columnsHtml}}</tr></table>
          <p>API: <a href="/api/board">/api/board</a></p>
        </body>
        </html>
        """;
    return Results.Content(html, "text/html");
});

// ---- the "logic", inline in endpoints -------------------------------------

app.MapPost("/add-card", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var colName = form["col"].ToString();
    var title = form["title"].ToString();       // "" is apparently a fine title
    foreach (var col in board)
        if ((string)col["name"] == colName)
            ((List<Dictionary<string, object>>)col["cards"]).Add(new Dictionary<string, object>
            {
                ["id"] = nextCardId,
                ["title"] = title,
            });
    nextCardId++;
    ctx.Response.Redirect("/");
});

app.MapPost("/move-card", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var id = int.Parse(form["id"].ToString());
    var toName = form["to"].ToString();
    var pos = int.Parse(form["pos"].ToString());  // "banana"? crash. -1? crash later.

    // hunt down the card and the list it currently lives in
    Dictionary<string, object>? card = null;
    List<Dictionary<string, object>>? fromCards = null;
    foreach (var col in board)
    {
        var cards = (List<Dictionary<string, object>>)col["cards"];
        foreach (var c in cards)
            if ((int)c["id"] == id) { card = c; fromCards = cards; }
    }

    // find the destination list
    List<Dictionary<string, object>>? toCards = null;
    foreach (var col in board)
        if ((string)col["name"] == toName)
            toCards = (List<Dictionary<string, object>>)col["cards"];

    // insert it where it should go... (unknown column? NullReference, 500.
    // position past the end? ArgumentOutOfRange, 500.)
    toCards!.Insert(pos, card!);

    // ...and remove it from where it was. Unless it's the same column —
    // it's already in there, so no need to remove anything, right?
    if (toCards != fromCards)
        fromCards!.Remove(card!);
    // (THE BUG: same-column moves insert a second copy and skip the removal.
    // The card is now in the list twice. Refresh and count them.)

    ctx.Response.Redirect("/");
});

// ---- the JSON API: the raw blobs, straight out the door -------------------

app.MapGet("/api/board", () => board);

app.Run("http://localhost:5028");
