// Tests.cs — the store's rules, including every "missing id" edge the
// endpoints translate into 404s. No HTTP needed for any of this.
public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("BookStore.Add");
        {
            var store = new BookStore();
            var b = store.Add("Dune", "Frank Herbert");
            Check.True(b is not null, "a valid book is added");
            Check.Equal(1, b!.Id, "the first book gets id 1");
            Check.Equal("Dune", b.Title, "title is stored");
            Check.Equal("Frank Herbert", b.Author, "author is stored");
            Check.Equal(2, store.Add("Emma", "Jane Austen")!.Id, "ids count up");
            Check.Equal(null, store.Add("", "Nobody"), "an empty title is rejected");
            Check.Equal(null, store.Add("   ", "Nobody"), "a whitespace title is rejected");
            Check.Equal(null, store.Add(null, "Nobody"), "a missing title is rejected");
            Check.Equal("unknown", store.Add("Anon Tales", null)!.Author, "a missing author becomes \"unknown\"");
            Check.Equal(3, store.All().Count, "rejected books were never stored");
        }

        Console.WriteLine("BookStore.Get — the 404 cases live here");
        {
            var store = new BookStore();
            var b = store.Add("Dune", "Frank Herbert")!;
            Check.Equal(b, store.Get(b.Id), "Get finds a book by id");
            Check.Equal(null, store.Get(999), "an unknown id returns null (endpoint turns this into 404)");
            Check.Equal(null, store.Get(0), "id 0 was never issued");
            Check.Equal(null, store.Get(-1), "negative ids return null, no crash");
        }

        Console.WriteLine("BookStore.Update");
        {
            var store = new BookStore();
            var b = store.Add("Dune", "Frank Herbert")!;
            var updated = store.Update(b.Id, "Dune Messiah", "Frank Herbert");
            Check.Equal("Dune Messiah", updated!.Title, "Update replaces the title");
            Check.Equal(null, store.Update(999, "Ghost Book", "Nobody"), "updating an unknown id returns null");
            Check.Equal(1, store.All().Count, "the failed update did not invent a book");
            Check.Equal(null, store.Update(b.Id, "", "X"), "an empty title is rejected");
            Check.Equal("Dune Messiah", store.Get(b.Id)!.Title, "the rejected update changed nothing");
            Check.Equal("unknown", store.Update(b.Id, "Dune Messiah", null)!.Author, "PUT with no author replaces it with \"unknown\" (full replacement!)");
        }

        Console.WriteLine("BookStore.Remove");
        {
            var store = new BookStore();
            var b = store.Add("Dune", "Frank Herbert")!;
            Check.True(store.Remove(b.Id), "Remove returns true when it deletes");
            Check.Equal(0, store.All().Count, "the book is gone");
            Check.True(!store.Remove(b.Id), "removing it again returns false (endpoint: 404)");
            Check.True(!store.Remove(999), "removing an unknown id returns false");
        }

        return Check.Summary();
    }
}
