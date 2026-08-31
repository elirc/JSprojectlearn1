public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("QuoteService: seed data");
        var svc = new QuoteService();
        Check.Equal(3, svc.Count, "default seed has 3 quotes");
        Check.True(svc.GetAll()[2].Text.Contains("<blink>"),
            "quote text may contain markup characters — it's DATA, the service must not mangle it");

        Console.WriteLine("QuoteService.Pick: any roll lands on a real quote");
        Check.Equal(svc.GetAll()[0], svc.Pick(0), "roll 0 -> first quote");
        Check.Equal(svc.GetAll()[2], svc.Pick(2), "roll 2 -> third quote");
        Check.Equal(svc.GetAll()[0], svc.Pick(3), "roll 3 wraps around to the first");
        Check.Equal(svc.GetAll()[1], svc.Pick(7), "roll 7 wraps (7 % 3 = 1)");
        Check.Equal(svc.GetAll()[2], svc.Pick(-1), "even a negative roll wraps to a valid quote");

        var empty = new QuoteService(new List<Quote>());
        Check.Throws<InvalidOperationException>(() => empty.Pick(0),
            "picking from an empty service throws (no quote to give)");

        Console.WriteLine("QuoteService.Add: validation and defaults");
        var before = svc.Count;
        var added = svc.Add("  Talk is cheap. Show me the code.  ", "  Linus Torvalds ");
        Check.Equal("Talk is cheap. Show me the code.", added.Text, "text is trimmed");
        Check.Equal("Linus Torvalds", added.Author, "author is trimmed");
        Check.Equal(before + 1, svc.Count, "the quote is stored");

        var anon = svc.Add("Ship it.", "   ");
        Check.Equal("Anonymous", anon.Author, "blank author becomes Anonymous");

        Check.Throws<ArgumentException>(() => svc.Add("   ", "someone"),
            "blank text is rejected");
        Check.Throws<ArgumentException>(() => svc.Add(null, "someone"),
            "missing text is rejected");
        Check.Equal(before + 2, svc.Count, "rejected quotes were not stored");

        Console.WriteLine("QuoteService: dangerous-looking input is stored verbatim");
        var spicy = svc.Add("<script>alert('hi')</script>", "an attacker");
        Check.Equal("<script>alert('hi')</script>", spicy.Text,
            "the service neither escapes nor executes — rendering safely is the frontend's job (textContent)");

        return Check.Summary();
    }
}
