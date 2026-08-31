// Pretend mailer (no network, no real SMTP): addresses containing "flaky"
// only succeed on the 5th attempt; everyone else succeeds immediately.
// Deterministic and pure — which makes the retry behavior testable.

public record SendReport(string To, string Host, int Attempts, bool Delivered);

public static class FakeSmtp
{
    public static SendReport Send(string host, string to, int maxAttempts)
    {
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            bool delivered = !to.Contains("flaky") || attempt >= 5;
            if (delivered) return new SendReport(to, host, attempt, true);
        }
        return new SendReport(to, host, maxAttempts, false);
    }
}
