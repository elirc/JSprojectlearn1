// FizzBuzz in C# — written the way you'd port 01-fizzbuzz/original.js line by line.
// Run from the repo root:
//   dotnet run csharp/01-hello-fizzbuzz/original.cs
//
// It works. Every line it prints is correct. That is not the same as good.

for (int i = 1; i <= 100; i++)
{
    if (i % 3 == 0 && i % 5 == 0)
    {
        Console.WriteLine("FizzBuzz");
    }
    else if (i % 3 == 0)
    {
        Console.WriteLine("Fizz");
    }
    else if (i % 5 == 0)
    {
        Console.WriteLine("Buzz");
    }
    else
    {
        Console.WriteLine(i);
    }
}
