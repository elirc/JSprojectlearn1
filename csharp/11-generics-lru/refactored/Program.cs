if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

Console.WriteLine("=== LruCache<string, string> (capacity 3) ===");
var users = new LruCache<string, string>(3);
users.Set("user:1", "Ada Lovelace");
users.Set("user:2", "Grace Hopper");
users.Set("user:3", "Margaret Hamilton");

users.TryGet("user:1", out var ada);            // reading user:1 refreshes it
Console.WriteLine($"user:1 -> {ada}   (no cast needed: the compiler KNOWS it's a string)");
Console.WriteLine($"oldest first: [{string.Join(", ", users.KeysByAge)}]");

users.Set("user:4", "Katherine Johnson");        // full -> evicts user:2, NOT user:1
Console.WriteLine($"after user:4 arrives: [{string.Join(", ", users.KeysByAge)}]");
Console.WriteLine($"user:2 evicted? {!users.Has("user:2")}   user:1 survived? {users.Has("user:1")}");

Console.WriteLine();
Console.WriteLine("=== the compiler now has our back ===");
var visits = new LruCache<string, int>(2);       // values are ints. Period.
visits.Set("home", 41);
visits.Set("about", 7);
int n = visits.Get("home");                      // n IS an int — no cast, no hope
Console.WriteLine($"home visits + 1 = {n + 1}");
Console.WriteLine();
Console.WriteLine("The original's crash line was:  (string)cache.Get(\"visits\")");
Console.WriteLine("Here, visits.Set(\"home\", \"lots\") would not even COMPILE —");
Console.WriteLine("the InvalidCastException is no longer possible to write.");
