public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("NotifierOptions.Validate: a good config passes");
        var good = new NotifierOptions { SmtpHost = "mail.internal.local", RetryCount = 5, BetaBanner = true };
        Check.Equal(0, good.Validate().Count, "sane options produce zero errors");

        Console.WriteLine("NotifierOptions.Validate: nonsense is rejected, by name");
        var negative = new NotifierOptions { SmtpHost = "mail.internal.local", RetryCount = -1 };
        Check.Equal(1, negative.Validate().Count, "negative retry count produces one error");
        Check.True(negative.Validate()[0].Contains("RetryCount"), "the error names the guilty setting");

        var zero = new NotifierOptions { SmtpHost = "mail.internal.local", RetryCount = 0 };
        Check.Equal(1, zero.Validate().Count, "zero retries is rejected (it would never even try)");

        var absurd = new NotifierOptions { SmtpHost = "mail.internal.local", RetryCount = 5000 };
        Check.Equal(1, absurd.Validate().Count, "absurdly high retry count is rejected as a likely typo");

        var noHost = new NotifierOptions { SmtpHost = "   ", RetryCount = 3 };
        Check.Equal(1, noHost.Validate().Count, "blank SmtpHost is rejected");
        Check.True(noHost.Validate()[0].Contains("SmtpHost"), "the host error names the setting too");

        var doublyBad = new NotifierOptions { SmtpHost = "", RetryCount = -2 };
        Check.Equal(2, doublyBad.Validate().Count, "multiple problems are ALL reported at once");

        Console.WriteLine("NotifierOptions: defaults");
        var defaults = new NotifierOptions();
        Check.Equal(3, defaults.RetryCount, "RetryCount defaults to 3 when config doesn't set it");
        Check.Equal(false, defaults.BetaBanner, "BetaBanner defaults to off");

        Console.WriteLine("FakeSmtp: retry behavior (why the retry setting MATTERS)");
        var ok = FakeSmtp.Send("mail.internal.local", "alice@team.local", 3);
        Check.Equal(true, ok.Delivered, "normal address delivers");
        Check.Equal(1, ok.Attempts, "normal address delivers on the first attempt");

        var flaky3 = FakeSmtp.Send("mail.internal.local", "flaky@team.local", 3);
        Check.Equal(false, flaky3.Delivered, "flaky address fails with 3 retries (the original /send)");
        Check.Equal(3, flaky3.Attempts, "it really tried all 3 times");

        var flaky5 = FakeSmtp.Send("mail.internal.local", "flaky@team.local", 5);
        Check.Equal(true, flaky5.Delivered, "flaky address succeeds with 5 retries (the original /send-bulk)");
        Check.Equal(5, flaky5.Attempts, "success came on attempt 5 — same address, different outcome. THAT was the bug.");

        return Check.Summary();
    }
}
