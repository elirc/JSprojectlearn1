// "WebSockets are hard, let's just use raw TCP for the chat server."
// Run it: node 67-websocket-chat/original.js — it demos its own bug.
import net from "node:net";

var clients = [];

var server = net.createServer(function (socket) {
  clients.push(socket);

  // THE core misunderstanding, Problem 1: TCP is a BYTE STREAM, not
  // a message service. 'data' fires with "whatever bytes arrived",
  // which may be HALF a message, or THREE messages glued together.
  // This handler assumes 1 event = exactly 1 message. It works on
  // localhost demos (small, fast, lucky) and dies in production.
  socket.on("data", function (chunk) {
    var message = chunk.toString(); // maybe 0.5 messages. maybe 3.
    console.log("server saw ONE 'message':", JSON.stringify(message));
    for (var i = 0; i < clients.length; i++) {
      if (clients[i] !== socket) clients[i].write(message);
    }
  });

  // Problem 2: no notion of a protocol AT ALL — no framing, no
  // opcodes, no close handshake (a vanished client is just an ECONNRESET
  // crash — see the error listener we forgot), no ping/pong, so a
  // silently dead connection stays in `clients` forever.

  // Problem 3: browsers can't even connect to this. A browser speaks
  // WebSocket: an HTTP Upgrade handshake, then MASKED, FRAMED
  // messages. Raw TCP is unreachable from a web page — so this chat
  // has no web client, which was the whole point.
});

server.listen(0, function () {
  var port = server.address().port;

  // ---- demo: two "messages" in one write = one mangled broadcast --
  var alice = net.connect(port);
  var bob = net.connect(port);

  bob.on("data", function (chunk) {
    console.log("bob received:", JSON.stringify(chunk.toString()));
    console.log("(two separate chat lines arrived FUSED — the server");
    console.log(" can't tell where one message ends and the next begins)");
    alice.end(); bob.end(); server.close();
  });

  setTimeout(function () {
    // TCP happily delivers these back-to-back writes as one chunk —
    // and even single writes can arrive SPLIT. Framing exists
    // because neither boundary is guaranteed.
    alice.write("hi bob!");
    alice.write("want to get lunch?");
  }, 50);
});
