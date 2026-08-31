// Tests.cs — every test builds its OWN service from a fresh repo and fakes.
// No shared state, no static Instance, no real clock, no real notifications.
// Run these in any order, any number of times: same results. That property
// is exactly what the original's singleton made impossible.

// FAKES: tiny stand-ins that implement the same interfaces production uses.
public class FakeClock : IClock
{
    public DateTime Now { get; set; } = new DateTime(2026, 1, 1);
}

public class FakeNotifier : INotifier
{
    public List<string> Sent { get; } = new();
    public void Notify(string message) => Sent.Add(message);
}

public static class Tests
{
    static readonly Quote[] Seed =
    {
        new("A", "author-a"),   // index 0
        new("B", "author-b"),   // index 1
        new("C", "author-c"),   // index 2
    };

    // Each call builds a completely independent world.
    static QuoteService Make(out InMemoryQuoteRepo repo, out FakeClock clock, out FakeNotifier notifier, bool seeded = true)
    {
        repo = new InMemoryQuoteRepo(seeded ? Seed : null);
        clock = new FakeClock();
        notifier = new FakeNotifier();
        return new QuoteService(repo, clock, notifier);
    }

    public static int Run()
    {
        Console.WriteLine("the original's two poisoned tests — now independent");
        {
            var svc = Make(out var repo, out _, out _);
            svc.Add("Talk is cheap. Show me the code.", "Linus Torvalds");
            Check.Equal(4, repo.All().Count, "test 1: adding a quote bumps the count");
        }
        {
            var svc = Make(out var repo, out _, out _);
            Check.Equal(3, repo.All().Count, "test 2: a fresh world has exactly the seeded quotes (no pollution possible)");
        }

        Console.WriteLine("QuoteService.Add — rules");
        {
            var svc = Make(out var repo, out _, out _);
            var q = svc.Add("  Stay hungry.  ", "  Stewart Brand ");
            Check.Equal("Stay hungry.", q!.Text, "text is trimmed");
            Check.Equal("Stewart Brand", q.Author, "author is trimmed");
            Check.Equal(null, svc.Add("", "X"), "empty text is rejected");
            Check.Equal(null, svc.Add("   ", "X"), "whitespace text is rejected");
            Check.Equal(null, svc.Add(null, "X"), "missing text is rejected");
            Check.Equal(4, repo.All().Count, "rejected quotes never reached the repo");
            Check.Equal("anonymous", svc.Add("No author here", null)!.Author, "a missing author becomes \"anonymous\"");
        }

        Console.WriteLine("QuoteService.Add — notifications (via FakeNotifier)");
        {
            var svc = Make(out _, out _, out var notifier);
            svc.Add("Ship it.", "ada");
            Check.Equal(1, notifier.Sent.Count, "a successful add sends exactly one notification");
            Check.True(notifier.Sent[0].Contains("ada"), "the notification names the author");
            svc.Add("", "ada");
            Check.Equal(1, notifier.Sent.Count, "a REJECTED add sends nothing");
        }

        Console.WriteLine("QuoteService.Daily — time is just another input (via FakeClock)");
        {
            var svc = Make(out _, out var clock, out _);
            clock.Now = new DateTime(2026, 1, 1);   // DayOfYear 1 → 1 % 3 → index 1
            Check.Equal("B", svc.Daily()!.Text, "Jan 1 picks index 1");
            Check.Equal("B", svc.Daily()!.Text, "same day, same quote — deterministic");
            clock.Now = new DateTime(2026, 1, 2);   // 2 % 3 → index 2
            Check.Equal("C", svc.Daily()!.Text, "Jan 2 picks index 2");
            clock.Now = new DateTime(2026, 1, 3);   // 3 % 3 → index 0
            Check.Equal("A", svc.Daily()!.Text, "Jan 3 wraps around to index 0");
            // The original's test 3 printed SKIP here: DateTime.Now was
            // hard-wired, so "what happens on Jan 3?" was unanswerable.
        }
        {
            var svc = Make(out _, out _, out _, seeded: false);
            Check.Equal(null, svc.Daily(), "an empty repo has no daily quote (endpoint: 404, not a crash)");
        }

        return Check.Summary();
    }
}
