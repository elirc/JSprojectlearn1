if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// The only file that prints — deliberately too simple to contain bugs.
foreach (var line in FizzBuzz.Range(1, 100))
{
    Console.WriteLine(line);
}
