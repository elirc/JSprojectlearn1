public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("PasswordHasher: we never learn your password (cs#23)");
        var hash = PasswordHasher.Hash("correct horse battery staple");
        Check.True(PasswordHasher.Verify("correct horse battery staple", hash),
            "the right password verifies against its hash");
        Check.True(!PasswordHasher.Verify("correct horse battery stapler", hash),
            "a wrong password (even one letter off) is rejected");
        Check.True(!hash.Contains("correct horse"), "the stored string does not contain the password");

        var hashA = PasswordHasher.Hash("hunter2hunter2");
        var hashB = PasswordHasher.Hash("hunter2hunter2");
        Check.True(hashA != hashB, "the salt means the same password gets DIFFERENT hashes");
        Check.True(PasswordHasher.Verify("hunter2hunter2", hashA), "...and both still verify");
        Check.True(PasswordHasher.Verify("hunter2hunter2", hashB), "...both of them");
        Check.Equal("100000", hashA.Split('$')[1], "the stored format records its own iteration count");
        Check.True(!PasswordHasher.Verify("anything", "hunter2"),
            "a plaintext-era entry verifies false instead of matching");
        Check.True(!PasswordHasher.Verify("anything", "pbkdf2-sha256$100000$!!!not-base64!!!$AAAA"),
            "corrupted storage verifies false instead of throwing");

        Console.WriteLine("UserStore: registration, and usernames that can't collide by case");
        var users = new UserStore();
        Check.True(users.Register("Alice", "hunter2hunter2"), "first registration succeeds");
        Check.True(!users.Register("alice", "some-other-password"),
            "\"alice\" is the SAME account as \"Alice\" — case cannot fork an identity");
        Check.True(users.CheckPassword("ALICE", "hunter2hunter2"), "and you can log in with any casing");
        Check.True(!users.CheckPassword("alice", "wrong-password"), "a wrong password is rejected");
        Check.True(!users.CheckPassword("nobody", "hunter2hunter2"), "an unknown user is rejected");
        Check.True(users.Exists("  alice  "), "surrounding whitespace is trimmed away too");
        Check.Equal(1, users.Count, "...and all of that is still one account");

        Console.WriteLine("SessionStore: opaque tokens, server-side truth (cs#23)");
        var sessions = new SessionStore();
        var aliceToken = sessions.Create("alice");
        Check.Equal(64, aliceToken.Length, "a token is 64 hex chars (32 random bytes)");
        Check.True(!aliceToken.Contains("alice"), "a token reveals nothing about its user");
        Check.Equal("alice", sessions.UserFor(aliceToken), "the store maps a token back to its user");
        Check.Equal(null, sessions.UserFor("alice"), "the ORIGINAL's cookie value maps to nobody");
        Check.Equal(null, sessions.UserFor(null), "no cookie, no user");

        var alicePhone = sessions.Create("alice");
        var bobToken = sessions.Create("bob");
        Check.True(aliceToken != alicePhone, "every login gets a fresh token (two devices, two sessions)");
        Check.True(sessions.Revoke(aliceToken), "revoking removes a session");
        Check.Equal(null, sessions.UserFor(aliceToken), "a revoked token is dead even if someone kept a copy");
        Check.Equal("alice", sessions.UserFor(alicePhone), "...and the other device is untouched");
        Check.Equal(1, sessions.RevokeAllFor("alice"), "RevokeAllFor kills what is left");
        Check.Equal(null, sessions.UserFor(alicePhone), "the phone session is gone too");
        Check.Equal("bob", sessions.UserFor(bobToken), "bob was not logged out");

        Console.WriteLine("NoteService: a user sees their own notes and only their own");
        var notes = new NoteService();
        var a1 = notes.Create("alice", "my diary password");
        var a2 = notes.Create("alice", "buy oat milk");
        var b1 = notes.Create("bob", "bob's shopping list");

        Check.Equal(1, a1.Id, "ids start at 1");
        Check.Equal("alice", a1.Owner, "the note records its owner");
        Check.Equal(3, a1.Id + a2.Id, "ids increment across users (1 + 2)");
        Check.Equal(3, b1.Id, "...one global id sequence, three notes");

        Check.Equal(2, notes.ListFor("alice").Count, "alice sees exactly two notes");
        Check.Equal(1, notes.ListFor("bob").Count, "bob sees exactly one");
        Check.Equal(0, notes.ListFor("mallory").Count, "a stranger sees NOTHING (the original's leak)");
        Check.Equal(a2.Id, notes.ListFor("alice")[0].Id, "a user's notes come back newest first");
        Check.True(notes.ListFor("alice").All(n => n.Owner == "alice"),
            "nothing belonging to anyone else can appear in alice's list");
        Check.Equal(2, notes.ListFor("ALICE").Count, "casing doesn't hide your own notes from you");

        Console.WriteLine("NoteService: the ownership rules, one per verb");
        Check.Equal(Access.Ok, notes.Get("alice", a1.Id).Access, "alice can read her own note");
        Check.Equal("my diary password", notes.Get("alice", a1.Id).Note!.Text, "...and gets the text");
        Check.Equal(Access.Forbidden, notes.Get("bob", a1.Id).Access, "bob CANNOT read alice's note");
        Check.Equal(null, notes.Get("bob", a1.Id).Note, "...and is handed no data at all");
        Check.Equal(Access.NotFound, notes.Get("alice", 999).Access, "a note that doesn't exist is NotFound");

        Check.Equal(Access.Forbidden, notes.Update("bob", a1.Id, "deleted lol").Access,
            "bob CANNOT edit alice's note (the original's tampering bug)");
        Check.Equal("my diary password", notes.Get("alice", a1.Id).Note!.Text,
            "...and the note is genuinely unchanged afterwards");
        Check.Equal(Access.Forbidden, notes.Delete("bob", a1.Id).Access, "bob CANNOT delete alice's note");
        Check.Equal(2, notes.ListFor("alice").Count, "...and alice still has both her notes");
        Check.Equal(Access.NotFound, notes.Update("alice", 999, "x").Access, "editing a missing note is NotFound");
        Check.Equal(Access.NotFound, notes.Delete("alice", 999).Access, "deleting a missing note is NotFound");

        Console.WriteLine("NoteService: CRUD invariants");
        var updated = notes.Update("alice", a1.Id, "  my NEW diary password  ");
        Check.Equal(Access.Ok, updated.Access, "alice can edit her own note");
        Check.Equal("my NEW diary password", updated.Note!.Text, "the text is trimmed on the way in");
        Check.Equal("alice", updated.Note.Owner, "an edit cannot re-home a note to someone else");
        Check.Equal(a1.CreatedAt, updated.Note.CreatedAt, "an edit cannot forge the creation time");
        Check.Equal(a1.Id, updated.Note.Id, "an edit cannot renumber a note");
        Check.Equal("my NEW diary password", notes.Get("alice", a1.Id).Note!.Text, "and the edit was stored");

        var deleted = notes.Delete("alice", a2.Id);
        Check.Equal(Access.Ok, deleted.Access, "alice can delete her own note");
        Check.Equal(1, notes.ListFor("alice").Count, "...and it is gone from her list");
        Check.Equal(Access.NotFound, notes.Delete("alice", a2.Id).Access, "deleting twice is NotFound");
        Check.Equal(1, notes.ListFor("bob").Count, "bob's note was never touched by any of this");
        Check.Equal(4, notes.Create("alice", "a fourth note").Id, "ids are never recycled after a delete");

        Console.WriteLine("NoteService.Validate: the text rules, with no HTTP in sight");
        Check.Equal(0, NoteService.Validate("hello").Count, "a normal note is fine");
        Check.Equal(1, NoteService.Validate(null).Count, "a missing text is one error");
        Check.Equal(1, NoteService.Validate("").Count, "an empty text is one error");
        Check.Equal(1, NoteService.Validate("      ").Count, "whitespace only is one error");
        Check.Equal(0, NoteService.Validate(new string('x', NoteService.MaxLength)).Count,
            "exactly the maximum length is allowed");
        Check.Equal(1, NoteService.Validate(new string('x', NoteService.MaxLength + 1)).Count,
            "one character over is not");

        Console.WriteLine("End to end, without a server: register -> login -> own notes");
        {
            var u = new UserStore();
            var s = new SessionStore();
            var n = new NoteService();

            u.Register("alice", "alice-passphrase");
            u.Register("bob", "bob-passphrase");

            Check.Equal(null, s.UserFor("session=alice"),
                "a forged cookie resolves to nobody, so no note is reachable");

            var aliceSession = u.CheckPassword("alice", "alice-passphrase") ? s.Create("alice") : null;
            var bobSession = u.CheckPassword("bob", "bob-passphrase") ? s.Create("bob") : null;
            Check.True(aliceSession is not null && bobSession is not null, "both users can log in");

            var secret = n.Create(s.UserFor(aliceSession)!, "the alarm code is 1234");
            Check.Equal(1, n.ListFor(s.UserFor(aliceSession)!).Count, "alice sees her note");
            Check.Equal(0, n.ListFor(s.UserFor(bobSession)!).Count, "bob's list is empty");
            Check.Equal(Access.Forbidden, n.Get(s.UserFor(bobSession)!, secret.Id).Access,
                "and bob cannot reach it by id either");

            s.Revoke(aliceSession);
            Check.Equal(null, s.UserFor(aliceSession), "after logout the session resolves to nobody");
        }

        return Check.Summary();
    }
}
