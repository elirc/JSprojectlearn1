if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton(ProductCatalog.Seeded());
var app = builder.Build();

// ONE list endpoint. There is no "give me everything" route, because there is
// no request a client can send that makes shipping 10,000 rows a good idea.
//
// Look at the parameter list: `int? page`, `int? pageSize`. These are TYPED,
// and that is the whole junk-input defence. ASP.NET Core parses them for us
// and answers `?page=abc` with a 400 before this lambda ever runs — no
// int.Parse, no try/catch, no 500. Making the type do the validation is
// cheaper and more reliable than remembering to check (cs#05, cs#17).
app.MapGet("/products", (int? page, int? pageSize, string? sort, string? search,
                         ProductCatalog catalog) =>
{
    // Reject what has no obvious intent...
    var errors = PageRequest.Validate(sort);
    if (errors.Count > 0) return Results.BadRequest(new { errors });

    // ...clamp what does, then hand a fully-normalized request to pure code.
    var request = PageRequest.Normalize(page, pageSize, sort, search);
    return Results.Ok(ProductQuery.Apply(catalog.Products, request));
});

// Handy for the experiments in LEARN.md: how big the original's answer was.
app.MapGet("/products/count", (ProductCatalog catalog) =>
    Results.Ok(new { totalItems = catalog.Count, maxPageSize = PageRequest.MaxPageSize }));

app.Run("http://localhost:5034");
