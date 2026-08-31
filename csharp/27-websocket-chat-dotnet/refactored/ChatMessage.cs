using System.Text.Json;

// The protocol: every message on the wire is one of these, as JSON.
// Three factory methods = the three message types = the whole vocabulary.
// The browser switches on `type`; nobody ever parses glued-together strings.
public record ChatMessage(string Type, string User, string Text, DateTimeOffset At)
{
    // Web defaults: camelCase property names, so C# `User` ⇄ JSON `user`.
    public static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static ChatMessage Chat(string user, string text) => new("chat", user, text, DateTimeOffset.Now);
    public static ChatMessage Join(string user) => new("join", user, "", DateTimeOffset.Now);
    public static ChatMessage Leave(string user) => new("leave", user, "", DateTimeOffset.Now);

    public string ToJson() => JsonSerializer.Serialize(this, JsonOptions);
}

// What the browser sends us: just the text. (The server already knows who
// you are from the join — clients don't get to claim names per message.)
public record IncomingMessage(string? Text)
{
    // Clients are untrusted: malformed JSON becomes null, never a crash.
    public static IncomingMessage? Parse(string json)
    {
        try { return JsonSerializer.Deserialize<IncomingMessage>(json, ChatMessage.JsonOptions); }
        catch (JsonException) { return null; }
    }
}

// What ChatRoom needs from "a connected client" — and nothing more.
// The real one wraps a WebSocket; the test one is a List<string>.
public interface ISocketSink
{
    bool IsOpen { get; }
    Task SendAsync(string json);
}
