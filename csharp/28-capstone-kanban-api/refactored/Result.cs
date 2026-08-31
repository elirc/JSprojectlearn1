// The cs#08 pattern: expected failures are RETURN VALUES, not exceptions.
// "That column doesn't exist" isn't exceptional — it's Tuesday. The caller
// gets a Result and must look at Ok before touching Value; the compiler's
// nullability warnings enforce the habit.

public sealed record Error(string Code, string Message);

public sealed class Result<T>
{
    public bool Ok { get; }
    public T? Value { get; }
    public Error? Error { get; }

    private Result(bool ok, T? value, Error? error)
    {
        Ok = ok;
        Value = value;
        Error = error;
    }

    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Fail(string code, string message) => new(false, default, new Error(code, message));
}
