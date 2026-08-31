// ============================================================================
// CS 12 — events-delegates — ORIGINAL (works today, edits forever)
// Run from repo root:  dotnet run csharp/12-events-delegates/original.cs
// ============================================================================
// A temperature monitor for a greenhouse. Readings come in; a logger, a
// dashboard and an alarm all want to know. This version wires them the
// "obvious" way: the monitor CREATES and CALLS every interested party itself.
// It runs fine — the disease is what happens every time someone NEW cares.

var monitor = new TemperatureMonitor(threshold: 30);

Console.WriteLine("=== greenhouse monitor, hard-wired edition ===");
foreach (var reading in new[] { 21.5, 24.0, 33.2, 28.9, 35.7 })
{
    monitor.Submit(reading);
}

Console.WriteLine();
Console.WriteLine("Now marketing wants SMS alerts, and ops wants a metrics counter.");
Console.WriteLine("Both changes mean reopening TemperatureMonitor — AGAIN (see the");
Console.WriteLine("changelog comments inside Submit). The class can never be finished.");

class ConsoleLogger
{
    public void Log(double t) => Console.WriteLine($"  [log]     reading: {t} C");
}

class DashboardDisplay
{
    public void Show(double t) => Console.WriteLine($"  [display] gauge now at {t} C");
}

class Alarm
{
    public void Trigger(double t) => Console.WriteLine($"  [ALARM]   {t} C is over the limit!");
}

// The monitor knows every listener BY NAME. To compile this class you must
// also compile ConsoleLogger, DashboardDisplay and Alarm; to test it you
// must drag all three along; to add a listener you must edit it.
class TemperatureMonitor
{
    private readonly ConsoleLogger logger = new();
    private readonly DashboardDisplay display = new();
    private readonly Alarm alarm = new();
    private readonly double threshold;

    public TemperatureMonitor(double threshold) { this.threshold = threshold; }

    public void Submit(double reading)
    {
        logger.Log(reading);          // hard-coded call #1
        display.Show(reading);        // hard-coded call #2
        if (reading > threshold)
        {
            alarm.Trigger(reading);   // hard-coded call #3
        }
        // v2: added the display        (this file was edited)
        // v3: added the alarm          (this file was edited)
        // v4: SMS? metrics? email?     (this file gets edited... again)
        // Every new listener reopens the one class that should be finished.
        // And nobody can ever UN-subscribe: the logger is welded in place.
    }
}
