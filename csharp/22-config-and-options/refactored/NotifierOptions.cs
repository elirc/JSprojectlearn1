// The strongly-typed shape of the "Notifier" section in appsettings.json.
// One record = the single source of truth for what settings exist, their
// types, and their defaults. Binding fills it from configuration (json file
// -> environment variables -> command line, later layers overriding earlier
// ones), and the rest of the app consumes it via IOptions<NotifierOptions> —
// no endpoint ever hard-codes a value again.

public record NotifierOptions
{
    public string SmtpHost { get; init; } = "";
    public int RetryCount { get; init; } = 3;
    public bool BetaBanner { get; init; }

    // Config is user input too — a typo in a JSON file or an env var can say
    // "RetryCount": -1 just as easily as a form can. Validate it like input,
    // and do it at STARTUP so a bad deploy fails loudly in seconds instead
    // of misbehaving quietly at 2am. Pure function -> tested in Tests.cs.
    public IReadOnlyList<string> Validate()
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(SmtpHost))
            errors.Add("Notifier:SmtpHost must not be empty");
        if (RetryCount < 1)
            errors.Add($"Notifier:RetryCount must be at least 1 (got {RetryCount})");
        if (RetryCount > 10)
            errors.Add($"Notifier:RetryCount above 10 is almost certainly a typo (got {RetryCount})");
        return errors;
    }
}
