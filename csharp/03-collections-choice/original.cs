// Count how often each character appears — C# port of 02-count-characters,
// written by someone who only knows arrays and index loops.
// Run from the repo root:
//   dotnet run csharp/03-collections-choice/original.cs
//
// The output is correct. The data structure is the problem: TWO parallel
// arrays pretending to be one table, glued together by index discipline.

string text = "hello world, hello c#";

// "A letter can appear at most text.Length times, and there can be at most
// text.Length different letters, so this is big enough." — technically true...
char[] letters = new char[text.Length];
int[] counts = new int[text.Length];
int used = 0;   // how many slots of the arrays are real data (the rest is junk)

for (int i = 0; i < text.Length; i++)
{
    char c = text[i];
    if (c == ' ')
    {
        continue;   // skip spaces — we count visible characters
    }

    // Have we seen this character before? Scan everything we've stored so far.
    bool found = false;
    for (int j = 0; j < used; j++)
    {
        if (letters[j] == c)
        {
            counts[j] = counts[j] + 1;
            found = true;
            break;
        }
    }

    // Never seen it: claim the next free slot in BOTH arrays.
    if (!found)
    {
        letters[used] = c;
        counts[used] = 1;
        used = used + 1;
    }
}

Console.WriteLine($"character counts for: \"{text}\"");
for (int j = 0; j < used; j++)
{
    Console.WriteLine("  " + letters[j] + ": " + counts[j]);
}

// Find the most common character: another manual scan with flag variables.
char best = '?';
int bestCount = -1;
for (int j = 0; j < used; j++)
{
    if (counts[j] > bestCount)
    {
        best = letters[j];
        bestCount = counts[j];
    }
}
Console.WriteLine($"most common: {best} (appears {bestCount} times)");
