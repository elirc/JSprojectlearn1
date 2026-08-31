// The monitor now knows NOBODY. It just announces two things:
//
//   ReadingReceived   — fires for every reading
//   ThresholdExceeded — fires for readings above the threshold
//
// Anyone can subscribe with +=, leave with -=, and this class never changes
// again. `Action<double>` is the delegate type ("a variable that holds a
// method taking one double"); the `event` keyword restricts outsiders to
// exactly two verbs: += (subscribe) and -= (unsubscribe). Only this class
// can raise the event or wipe the list.
public class TemperatureMonitor
{
    public double Threshold { get; }

    public event Action<double>? ReadingReceived;
    public event Action<double>? ThresholdExceeded;

    public TemperatureMonitor(double threshold) => Threshold = threshold;

    public void Submit(double reading)
    {
        // With zero subscribers the delegate is null — the "?." from
        // project 05 makes that a silent no-op instead of a crash.
        ReadingReceived?.Invoke(reading);

        if (reading > Threshold)
            ThresholdExceeded?.Invoke(reading);
    }
}
