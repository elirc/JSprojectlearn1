// Program.cs — the endpoints ask the framework for TYPED input and hand it
// to pure logic. Binding (JSON → record, query → int) is the framework's
// job; deciding what's valid is SignupValidator's job; both are visible here
// in two short endpoints.

if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// The JSON body is bound into SignupRequest automatically. Unreadable JSON
// never reaches us — the framework answers 400 on its own.
app.MapPost("/signup", (SignupRequest body) =>
{
    var errors = SignupValidator.Validate(body);
    return errors.Count > 0
        ? Results.ValidationProblem(errors)                       // 400, standard shape, ALL errors
        : Results.Ok(new { message = $"welcome, {body.Email!.Trim()}" });
});

// Declaring `int age` makes the framework parse the query string and answer
// 400 on "?age=abc" by itself. This handler body never sees garbage.
app.MapGet("/discount", (int age) => new { age, percent = DiscountRules.Percent(age) });

app.Run("http://localhost:5017");
