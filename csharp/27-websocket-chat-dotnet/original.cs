#:sdk Microsoft.NET.Sdk.Web
// WebSocket chat — the version that slowly fills with ghosts.
//
// Run from the repo root:
//   dotnet run csharp/27-websocket-chat-dotnet/original.cs
// then open http://localhost:5027 in TWO browser windows and chat.
//
// It works — until it doesn't. Close one window and the server keeps
// "sending" to the dead socket forever (the errors are swallowed on line
// "catch { }"). Nobody is ever removed from the list. Two people joining at
// the same instant can corrupt the list mid-loop. And names, history, joins
// and chat all share one tangled loop with no message format at all.

using System.Net.WebSockets;
using System.Text;

var sockets = new List<WebSocket>();   // shared by every connection, no lock
var history = new List<string>();      // grows forever

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

app.MapGet("/", () => Results.Content("""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Chat (original)</title></head>
    <body>
      <h1>Chat</h1>
      <div id="log" style="border:1px solid #999;height:300px;overflow-y:auto;padding:8px"></div>
      <form id="f"><input id="m" autocomplete="off"><button>Send</button></form>
      <script>
        var name = prompt("Your name?") || "anon";
        var ws = new WebSocket("ws://" + location.host + "/ws?name=" + encodeURIComponent(name));
        var log = document.getElementById("log");
        ws.onmessage = function (e) {
          log.innerHTML += "<div>" + e.data + "</div>";   // chat text straight into HTML...
          log.scrollTop = log.scrollHeight;
        };
        ws.onclose = function () {
          log.innerHTML += "<div><i>disconnected - refresh the page</i></div>";
        };
        document.getElementById("f").onsubmit = function (e) {
          e.preventDefault();
          var m = document.getElementById("m");
          ws.send(m.value);
          m.value = "";
        };
      </script>
    </body>
    </html>
    """, "text/html"));

app.Map("/ws", async (HttpContext ctx) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest) { ctx.Response.StatusCode = 400; return; }
    var ws = await ctx.WebSockets.AcceptWebSocketAsync();

    sockets.Add(ws);   // two joins at once → List.Add races → corrupted list
    var name = ctx.Request.Query["name"].ToString();
    if (name == "") name = "anon";

    // catch-up, join announcement, and chat all inline in the socket handler
    foreach (var line in history)
        await Send(ws, line);

    var joined = "* " + name + " joined *";
    history.Add(joined);
    foreach (var s in sockets)
        try { await Send(s, joined); } catch { }   // dead socket? pretend it's fine

    var buffer = new byte[4096];
    while (true)
    {
        WebSocketReceiveResult result;
        try { result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None); }
        catch { break; }
        if (result.MessageType == WebSocketMessageType.Close) break;

        var text = Encoding.UTF8.GetString(buffer, 0, result.Count);
        var line = name + ": " + text;             // the "protocol": glued strings
        history.Add(line);
        foreach (var s in sockets)                  // still includes every dead socket
            try { await Send(s, line); } catch { } // sends to ghosts, swallows the screams
    }
    // The loop ended: this socket is dead. And yet... nothing happens here.
    // No removal from the list, no "left" message. The ghost stays forever.
});

app.Run("http://localhost:5027");

static async Task Send(WebSocket ws, string text) =>
    await ws.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(text)),
        WebSocketMessageType.Text, true, CancellationToken.None);
