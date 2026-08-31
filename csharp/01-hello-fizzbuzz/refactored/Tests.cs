public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("FizzBuzz.For — single numbers");
        Check.Equal("1", FizzBuzz.For(1), "1 stays \"1\"");
        Check.Equal("2", FizzBuzz.For(2), "2 stays \"2\"");
        Check.Equal("Fizz", FizzBuzz.For(3), "3 is Fizz");
        Check.Equal("Buzz", FizzBuzz.For(5), "5 is Buzz");
        Check.Equal("Fizz", FizzBuzz.For(9), "9 is Fizz");
        Check.Equal("Buzz", FizzBuzz.For(100), "100 is Buzz");
        Check.Equal("FizzBuzz", FizzBuzz.For(15), "15 is FizzBuzz");
        Check.Equal("FizzBuzz", FizzBuzz.For(45), "45 is FizzBuzz");
        Check.Equal("7", FizzBuzz.For(7), "7 stays \"7\"");

        Console.WriteLine("FizzBuzz.For — edge cases");
        Check.Equal("FizzBuzz", FizzBuzz.For(0), "0 divides evenly by everything");
        Check.Equal("Fizz", FizzBuzz.For(-3), "negative multiples still count");
        Check.Equal("-1", FizzBuzz.For(-1), "plain negatives come back as text");

        Console.WriteLine("FizzBuzz.Range");
        var lines = FizzBuzz.Range(1, 5);
        Check.Equal(5, lines.Count, "1..5 gives 5 lines");
        Check.Equal("1", lines[0], "first line is \"1\"");
        Check.Equal("Fizz", lines[2], "third line is Fizz");
        Check.Equal("Buzz", lines[4], "fifth line is Buzz");
        Check.Equal(100, FizzBuzz.Range(1, 100).Count, "1..100 gives 100 lines");
        Check.Equal("FizzBuzz", FizzBuzz.Range(1, 100)[14], "line 15 of the real run is FizzBuzz");
        Check.Equal(0, FizzBuzz.Range(5, 1).Count, "backwards range gives no lines");
        Check.Equal(1, FizzBuzz.Range(7, 7).Count, "single-number range gives 1 line");

        return Check.Summary();
    }
}
