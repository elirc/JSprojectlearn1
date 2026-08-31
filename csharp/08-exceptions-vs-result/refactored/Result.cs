// A Result makes "this can fail, and here is EVERY reason why" part of the
// return type — where the caller can't miss it, and where ALL the failures
// fit (a thrown exception can only ever carry the first).
public record Result(bool Ok, IReadOnlyList<string> Errors)
{
    public static Result Success() => new(true, Array.Empty<string>());

    public static Result Failure(IEnumerable<string> errors)
    {
        var list = errors.ToList();
        if (list.Count == 0)
            throw new ArgumentException("A failure needs at least one error.", nameof(errors));
        return new Result(false, list);
    }
}
