using System.Net.WebSockets;
using System.Text;

// The real ISocketSink: a thin adapter over an actual WebSocket.
// All the WebSocket-specific fiddliness lives here so ChatRoom (and its
// tests) never have to touch a real socket.
public sealed class WebSocketSink : ISocketSink
{
    private readonly WebSocket socket;

    // A WebSocket allows only ONE outgoing send at a time. Two broadcasts
    // can overlap (two people talking at once), so sends take a turn-taking
    // token first. SemaphoreSlim is the awaitable cousin of lock.
    private readonly SemaphoreSlim sendTurn = new(1, 1);

    public WebSocketSink(WebSocket socket)
    {
        this.socket = socket;
    }

    public bool IsOpen => socket.State == WebSocketState.Open;

    public async Task SendAsync(string json)
    {
        var bytes = Encoding.UTF8.GetBytes(json);
        await sendTurn.WaitAsync();
        try
        {
            await socket.SendAsync(new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text, endOfMessage: true, CancellationToken.None);
        }
        finally
        {
            sendTurn.Release();
        }
    }

    // Receive one COMPLETE text message (a message can arrive in several
    // frames — keep reading until EndOfMessage). Returns null when the
    // client closed or the connection died: both just mean "they're gone".
    public static async Task<string?> ReceiveTextAsync(WebSocket socket)
    {
        var buffer = new byte[4 * 1024];
        using var whole = new MemoryStream();
        while (true)
        {
            WebSocketReceiveResult result;
            try
            {
                result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }
            catch (WebSocketException)
            {
                return null;   // vanished mid-receive: routine departure, not a crash
            }
            if (result.MessageType == WebSocketMessageType.Close) return null;
            whole.Write(buffer, 0, result.Count);
            if (result.EndOfMessage) return Encoding.UTF8.GetString(whole.ToArray());
        }
    }
}
