// Tests for the domain layer only. No server, no ports, no HTTP — that's
// what makes them fast enough to run on every save.
public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("TodoService");
        AddAssignsIdsAndTrims();
        AddRejectsBlankText();
        ToggleFlipsDone();
        UpdateChangesTextAndDone();
        RemoveDeletes();
        CountsAreDerived();
        return Check.Summary();
    }

    static void AddAssignsIdsAndTrims()
    {
        var service = new TodoService();
        var first = service.Add("  buy milk  ");
        var second = service.Add("call mom");
        Check.Equal("buy milk", first.Text, "Add trims surrounding spaces");
        Check.Equal(1, first.Id, "first todo gets id 1");
        Check.Equal(2, second.Id, "ids keep counting up");
        Check.Equal(false, first.Done, "new todos start not-done");
        Check.Equal(2, service.All.Count, "All sees both todos");
    }

    static void AddRejectsBlankText()
    {
        var service = new TodoService();
        Check.Throws<ArgumentException>(() => service.Add(""), "empty text is rejected");
        Check.Throws<ArgumentException>(() => service.Add("   "), "whitespace-only text is rejected");
        Check.Throws<ArgumentException>(() => service.Add(null), "null text is rejected");
        Check.Equal(0, service.All.Count, "nothing was added");
    }

    static void ToggleFlipsDone()
    {
        var service = new TodoService();
        var todo = service.Add("laundry");
        var toggled = service.Toggle(todo.Id);
        Check.Equal(true, toggled!.Done, "toggle marks it done");
        var again = service.Toggle(todo.Id);
        Check.Equal(false, again!.Done, "toggling twice puts it back");
        Check.True(service.Toggle(999) is null, "toggling an unknown id returns null");
    }

    static void UpdateChangesTextAndDone()
    {
        var service = new TodoService();
        var todo = service.Add("draft email");
        var renamed = service.Update(todo.Id, "send email", null);
        Check.Equal("send email", renamed!.Text, "Update can change the text");
        Check.Equal(false, renamed.Done, "null done leaves done alone");
        var finished = service.Update(todo.Id, null, true);
        Check.Equal("send email", finished!.Text, "null text leaves text alone");
        Check.Equal(true, finished.Done, "Update can set done");
        Check.True(service.Update(42, "ghost", true) is null, "updating an unknown id returns null");
        Check.Throws<ArgumentException>(() => service.Update(todo.Id, "  ", null), "blank replacement text is rejected");
    }

    static void RemoveDeletes()
    {
        var service = new TodoService();
        var todo = service.Add("old task");
        Check.Equal(true, service.Remove(todo.Id), "Remove reports success");
        Check.Equal(0, service.All.Count, "the todo is gone");
        Check.Equal(false, service.Remove(todo.Id), "removing twice reports failure");
    }

    static void CountsAreDerived()
    {
        var service = new TodoService();
        Check.Equal(new TodoCounts(0, 0, 0), service.Counts(), "empty list counts are all zero");
        service.Add("a");
        var b = service.Add("b");
        service.Add("c");
        service.Toggle(b.Id);
        Check.Equal(new TodoCounts(3, 2, 1), service.Counts(), "counts come from the same list the UI renders");
    }
}
