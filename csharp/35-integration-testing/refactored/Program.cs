if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Two lines, and neither of them knows anything about orders. Everything this
// app IS lives in Api.Build — which is precisely why the tests can have it too.
var app = Api.Build(args);
app.Run("http://localhost:5035");
