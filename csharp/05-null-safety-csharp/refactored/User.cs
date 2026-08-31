// The type now TELLS THE TRUTH:
//   Name  is string  — never null, the compiler enforces it at every call site.
//   Email is string? — explicitly "string or null", so every use must handle null.
public record User(int Id, string Name, string? Email);
