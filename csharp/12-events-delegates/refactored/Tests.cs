public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("TemperatureMonitor events");

        // --- multiple subscribers all hear the event ------------------------
        var monitor = new TemperatureMonitor(threshold: 30);
        var heardByLogger = new List<double>();
        var heardByDisplay = new List<double>();
        monitor.ReadingReceived += heardByLogger.Add;
        monitor.ReadingReceived += heardByDisplay.Add;
        monitor.Submit(25);
        Check.Equal(1, heardByLogger.Count, "first subscriber hears the reading");
        Check.Equal(1, heardByDisplay.Count, "second subscriber hears it too (+= adds, never overwrites)");
        Check.Equal(25d, heardByLogger[0], "the reading's value is delivered intact");

        // --- threshold event fires only above the threshold -----------------
        var alarms = new List<double>();
        monitor.ThresholdExceeded += alarms.Add;
        monitor.Submit(28);
        Check.Equal(0, alarms.Count, "no alarm at 28 (below the 30 threshold)");
        monitor.Submit(35);
        Check.Equal(1, alarms.Count, "alarm fires once at 35");
        Check.Equal(35d, alarms[0], "alarm receives the offending reading");

        // --- unsubscribe with -= --------------------------------------------
        var readings = new List<double>();
        Action<double> listener = readings.Add;
        var m2 = new TemperatureMonitor(30);
        m2.ReadingReceived += listener;
        m2.Submit(20);
        m2.ReadingReceived -= listener;
        m2.Submit(21);
        Check.Equal(1, readings.Count, "-= detaches: nothing delivered after unsubscribing");

        // --- no-subscriber safety -------------------------------------------
        var lonely = new TemperatureMonitor(30);
        lonely.Submit(99);   // would be a NullReferenceException without ?.Invoke
        Check.True(true, "raising with zero subscribers does not throw (?.Invoke)");

        Console.WriteLine("EventHub<T>");

        // --- delivers to all subscribers -------------------------------------
        var hub = new EventHub<string>();
        var a = new List<string>();
        var b = new List<string>();
        var offA = hub.Subscribe(a.Add);
        hub.Subscribe(b.Add);
        Check.Equal(2, hub.SubscriberCount, "hub tracks two subscribers");
        hub.Publish("one");
        Check.True(a.Count == 1 && b.Count == 1, "both subscribers receive a published message");

        // --- the returned action unsubscribes --------------------------------
        offA();
        hub.Publish("two");
        Check.Equal(1, a.Count, "unsubscribed A hears nothing more");
        Check.Equal(2, b.Count, "B still receives");
        Check.Equal(1, hub.SubscriberCount, "subscriber count drops after unsubscribe");

        offA();   // calling the unsubscribe action again must be harmless
        Check.Equal(1, hub.SubscriberCount, "unsubscribing twice is safe (idempotent)");

        // --- publishing with no subscribers -----------------------------------
        var empty = new EventHub<int>();
        empty.Publish(7);
        Check.True(true, "publishing to an empty hub does not throw");

        // --- unsubscribing mid-delivery can't skip neighbours -----------------
        var hub2 = new EventHub<int>();
        var seen = new List<string>();
        Action offFirst = () => { };
        offFirst = hub2.Subscribe(_ => { seen.Add("first"); offFirst(); });  // leaves DURING delivery
        hub2.Subscribe(_ => seen.Add("second"));
        hub2.Publish(1);
        Check.Equal("first,second", string.Join(",", seen),
            "a handler leaving mid-publish does not skip the next handler");
        hub2.Publish(2);
        Check.Equal("first,second,second", string.Join(",", seen),
            "and it really is gone on the next publish");

        return Check.Summary();
    }
}
