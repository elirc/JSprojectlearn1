public static class Tests
{
    public static int Run()
    {
        // The SAME contract suite runs against the fake and the real thing.
        // If the fake ever drifts from the real repo, these tests catch it —
        // that's what keeps "tests pass" meaning "the app works".
        Console.WriteLine("Contract suite vs InMemoryNoteRepo (the fake)");
        ContractSuite(new InMemoryNoteRepo(), "memory");

        Console.WriteLine("Contract suite vs JsonFileNoteRepo (the real one, on a temp file)");
        var tempA = Path.GetTempFileName();   // creates an EMPTY file — also proves empty files don't crash
        try
        {
            ContractSuite(new JsonFileNoteRepo(tempA), "file");
        }
        finally { File.Delete(tempA); }

        Console.WriteLine("JsonFileNoteRepo: file-specific behavior");
        var missingPath = Path.Combine(Path.GetTempPath(), $"notes-{Guid.NewGuid():N}.json");
        try
        {
            var fresh = new JsonFileNoteRepo(missingPath);
            Check.Equal(0, fresh.GetAll().Count, "missing file reads as empty (graceful first run)");
            Check.True(!File.Exists(missingPath), "reading alone doesn't create the file");

            fresh.Add("first note ever");
            Check.True(File.Exists(missingPath), "first write creates the file");

            // A brand-new repo instance on the same path = "the app restarted".
            var afterRestart = new JsonFileNoteRepo(missingPath);
            Check.Equal(1, afterRestart.GetAll().Count, "notes survive a restart");
            Check.Equal("first note ever", afterRestart.GetAll()[0].Text, "text survives a restart");
        }
        finally { if (File.Exists(missingPath)) File.Delete(missingPath); }

        return Check.Summary();
    }

    // One suite, any INoteRepo — this is the interface seam paying rent.
    private static void ContractSuite(INoteRepo repo, string label)
    {
        Check.Equal(0, repo.GetAll().Count, $"[{label}] starts empty");

        var a = repo.Add("buy milk");
        Check.Equal(1, a.Id, $"[{label}] first note gets id 1");
        Check.Equal("buy milk", a.Text, $"[{label}] Add stores the text");
        Check.Equal(false, a.Pinned, $"[{label}] new notes start unpinned");

        var b = repo.Add("water plants");
        Check.Equal(2, b.Id, $"[{label}] ids increment");
        Check.Equal(2, repo.GetAll().Count, $"[{label}] GetAll sees both notes");

        Check.Equal("buy milk", repo.Find(1)!.Text, $"[{label}] Find locates by id");
        Check.Equal(null, repo.Find(999), $"[{label}] Find on a missing id returns null");

        var updated = repo.Update(1, "buy oat milk", pinned: true);
        Check.Equal("buy oat milk", updated!.Text, $"[{label}] Update changes the text");
        Check.Equal(true, updated.Pinned, $"[{label}] Update changes pinned");
        Check.Equal("buy oat milk", repo.Find(1)!.Text, $"[{label}] the update is actually stored");
        Check.Equal(null, repo.Update(999, "x", false), $"[{label}] Update on a missing id returns null");

        Check.Equal(true, repo.Delete(2), $"[{label}] Delete reports success");
        Check.Equal(false, repo.Delete(2), $"[{label}] deleting twice reports failure");
        Check.Equal(1, repo.GetAll().Count, $"[{label}] deleted notes are gone");

        Check.Equal(true, repo.Delete(1), $"[{label}] cleanup: delete the last note");
        Check.Equal(0, repo.GetAll().Count, $"[{label}] ends empty");
    }
}
