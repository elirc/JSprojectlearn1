// Tests.cs — tests the DECISIONS (TodoService) without any HTTP at all.
// The original could not be tested this way: its logic only existed inside
// endpoint lambdas, reachable only by booting a server and sending requests.
public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("TodoService.Add");
        {
            var svc = new TodoService();
            var t = svc.Add("buy milk");
            Check.True(t is not null, "a valid title creates a todo");
            Check.Equal(1, t!.Id, "the first todo gets id 1");
            Check.Equal("buy milk", t.Title, "the title is stored");
            Check.Equal(false, t.Done, "new todos start not-done");
            Check.Equal(2, svc.Add("walk dog")!.Id, "ids count up");
            Check.Equal(null, svc.Add(""), "an empty title is rejected");
            Check.Equal(null, svc.Add("   "), "a whitespace-only title is rejected");
            Check.Equal(null, svc.Add(null), "a missing title is rejected");
            Check.Equal("trimmed", svc.Add("  trimmed  ")!.Title, "titles are trimmed");
            Check.Equal(3, svc.All().Count, "rejected todos were never added");
        }

        Console.WriteLine("TodoService.Get / Toggle / Remove");
        {
            var svc = new TodoService();
            var a = svc.Add("a")!;
            Check.Equal(a, svc.Get(a.Id), "Get finds a todo by id (records compare by value, cs#07)");
            Check.Equal(null, svc.Get(999), "Get returns null for unknown ids");
            Check.Equal(true, svc.Toggle(a.Id)!.Done, "Toggle flips done to true");
            Check.Equal(false, svc.Toggle(a.Id)!.Done, "Toggle flips it back to false");
            Check.Equal(null, svc.Toggle(999), "Toggle returns null for unknown ids");
            Check.True(svc.Remove(a.Id), "Remove returns true when it deletes");
            Check.Equal(0, svc.All().Count, "the removed todo is gone");
            Check.True(!svc.Remove(a.Id), "Remove returns false the second time");
        }

        Console.WriteLine("TodoService.Update");
        {
            var svc = new TodoService();
            var a = svc.Add("old title")!;
            var updated = svc.Update(a.Id, "new title", done: true);
            Check.Equal("new title", updated!.Title, "Update replaces the title");
            Check.Equal(true, updated.Done, "Update sets done");
            Check.Equal(null, svc.Update(a.Id, "", done: false), "an empty title is rejected");
            Check.Equal("new title", svc.Get(a.Id)!.Title, "a rejected update changed nothing");
            Check.Equal(null, svc.Update(999, "x", done: false), "unknown ids return null");
        }

        Console.WriteLine("TodoService.Filter");
        {
            var svc = new TodoService();
            svc.Add("a"); svc.Add("b"); svc.Add("c");
            svc.Toggle(2);
            Check.Equal(3, svc.Filter(null).Count, "no filter returns everything");
            Check.Equal(1, svc.Filter("done").Count, "filter=done returns only finished todos");
            Check.Equal("b", svc.Filter("done")[0].Title, "and it is the one we toggled");
            Check.Equal(2, svc.Filter("open").Count, "filter=open returns only unfinished todos");
            Check.Equal(3, svc.Filter("banana").Count, "an unknown filter returns everything");
        }

        return Check.Summary();
    }
}
