if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

Console.WriteLine("=== greenhouse monitor, event edition ===");
var monitor = new TemperatureMonitor(threshold: 30);

// Listeners wire THEMSELVES up. The monitor's source code never changes,
// no matter how many parties care.
monitor.ReadingReceived   += t => Console.WriteLine($"  [log]     reading: {t} C");
monitor.ReadingReceived   += t => Console.WriteLine($"  [display] gauge now at {t} C");
monitor.ThresholdExceeded += t => Console.WriteLine($"  [ALARM]   {t} C is over the limit!");

foreach (var reading in new[] { 21.5, 33.2, 28.9 })
    monitor.Submit(reading);

Console.WriteLine();
Console.WriteLine("=== the EventHub: subscribe returns an unsubscribe ===");
var hub = new EventHub<string>();
var offA = hub.Subscribe(msg => Console.WriteLine($"  A heard: {msg}"));
hub.Subscribe(msg => Console.WriteLine($"  B heard: {msg}"));

hub.Publish("first message");
offA();                                   // A leaves — nobody edits the hub
Console.WriteLine("  (A unsubscribed)");
hub.Publish("second message");

Console.WriteLine();
Console.WriteLine("Adding SMS alerts tomorrow = ONE new `+=` line at the call site.");
Console.WriteLine("In the original it meant reopening the monitor class itself.");
