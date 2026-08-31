public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("PasswordHasher: the round trip");
        var hash = PasswordHasher.Hash("correct horse battery staple");
        Check.True(PasswordHasher.Verify("correct horse battery staple", hash),
            "the right password verifies against its hash");
        Check.True(!PasswordHasher.Verify("correct horse battery stapler", hash),
            "a wrong password (even one letter off) is rejected");
        Check.True(!hash.Contains("correct horse"),
            "the stored string does not contain the password");

        Console.WriteLine("PasswordHasher: salt means same password != same hash");
        var hashA = PasswordHasher.Hash("hunter2");
        var hashB = PasswordHasher.Hash("hunter2");
        Check.True(hashA != hashB, "two users with the same password get DIFFERENT hashes");
        Check.True(PasswordHasher.Verify("hunter2", hashA), "...and the first still verifies");
        Check.True(PasswordHasher.Verify("hunter2", hashB), "...and so does the second");

        Console.WriteLine("PasswordHasher: stored format");
        var parts = hashA.Split('$');
        Check.Equal(4, parts.Length, "stored string has 4 $-separated parts");
        Check.Equal("pbkdf2-sha256", parts[0], "part 0 names the algorithm");
        Check.Equal("100000", parts[1], "part 1 records the iteration count");

        Console.WriteLine("PasswordHasher: garbage in the store never verifies (and never throws)");
        Check.True(!PasswordHasher.Verify("anything", "hunter2"), "a plaintext-era entry verifies false");
        Check.True(!PasswordHasher.Verify("anything", ""), "empty stored string verifies false");
        Check.True(!PasswordHasher.Verify("anything", "pbkdf2-sha256$100000$!!!not-base64!!!$AAAA"),
            "corrupted base64 verifies false instead of throwing");

        Console.WriteLine("UserStore: register + check");
        var users = new UserStore();
        Check.True(users.Register("alice", "hunter2hunter2"), "first registration succeeds");
        Check.True(!users.Register("alice", "whatever-else"), "duplicate username is refused");
        Check.True(users.CheckPassword("alice", "hunter2hunter2"), "correct password checks out");
        Check.True(!users.CheckPassword("alice", "wrong-password"), "wrong password is rejected");
        Check.True(!users.CheckPassword("nobody", "hunter2hunter2"), "unknown user is rejected");
        Check.True(!users.Snapshot()["alice"].Contains("hunter2"),
            "the stored table contains no plaintext password");

        Console.WriteLine("SessionStore: opaque tokens, server-side truth");
        var sessions = new SessionStore();
        var token = sessions.Create("alice");
        Check.Equal(64, token.Length, "token is 64 hex chars (32 random bytes)");
        Check.True(!token.Contains("alice"), "token reveals nothing about the user");
        Check.Equal("alice", sessions.UserFor(token), "the store maps the token back to its user");
        Check.Equal(null, sessions.UserFor("session=admin-style-forgery"), "a made-up token maps to nobody");
        Check.Equal(null, sessions.UserFor(null), "no cookie, no user");

        var token2 = sessions.Create("alice");
        Check.True(token != token2, "every login gets a fresh token (two devices, two sessions)");

        Check.True(sessions.Revoke(token), "revoke removes the session");
        Check.Equal(null, sessions.UserFor(token), "a revoked token is dead, even if someone kept a copy");
        Check.True(!sessions.Revoke(token), "revoking twice reports false");
        Check.Equal("alice", sessions.UserFor(token2), "other sessions are untouched");

        return Check.Summary();
    }
}
