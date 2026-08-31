if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<ChatRoom>();   // ONE room shared by every connection
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseWebSockets();

// The socket loop is all that's left here: receive → parse → ChatRoom call.
// Every decision (who hears what, history, pruning) lives in ChatRoom.
app.Map("/ws", async (HttpContext context, ChatRoom room) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    var sink = new WebSocketSink(socket);
    var ticket = await room.JoinAsync(context.Request.Query["name"].ToString(), sink);

    try
    {
        while (true)
        {
            var text = await WebSocketSink.ReceiveTextAsync(socket);
            if (text is null) break;   // closed or vanished — same exit either way

            var incoming = IncomingMessage.Parse(text);
            if (incoming is not null)
                await room.SayAsync(ticket.User, incoming.Text);
        }
    }
    finally
    {
        // however the loop ends — clean close, crash, kicked cable —
        // the room always finds out.
        await room.LeaveAsync(sink);
    }
});

app.Run("http://localhost:5027");
