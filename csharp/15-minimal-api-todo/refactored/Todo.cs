// The shape of our data, stated once. Compare with the original's
// Dictionary<string, object>, where every endpoint had to *remember* the keys.
// A record (cs#07) gives us value equality and non-destructive `with` updates.
public record Todo(int Id, string Title, bool Done);

// DTOs ("data transfer objects"): the shapes clients are allowed to send us.
// Title is string? because a client might omit it — validation decides.
public record CreateTodo(string? Title);
public record UpdateTodo(string? Title, bool Done);
