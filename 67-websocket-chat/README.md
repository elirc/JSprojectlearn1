# 67 — Real-time chat (WebSockets from scratch)

**Lesson: TCP is a byte stream, not a message service — framing is the fix,
and the WebSocket protocol is small enough to implement yourself.**

## Run it

```
node 67-websocket-chat/original.js       # watch two messages arrive fused
node --test 67-websocket-chat/
node 67-websocket-chat/refactored/server.js
```

Then open http://localhost:3000 in **two browser windows** and chat.
Real browsers, zero libraries. (Kill the server mid-chat and watch the
client reconnect with backoff.)

## What's wrong with the original?

1. **The core misunderstanding: 1 `data` event ≠ 1 message.** TCP delivers
   "whatever bytes arrived" — half a message, or three fused. The demo
   proves it: two chat lines arrive as `"hi bob!want to get lunch?"`.
   Localhost demos work by luck; production doesn't.
2. **No protocol at all** — no close handshake (a vanished client is an
   ECONNRESET crash), no ping/pong (dead connections linger in the client
   list forever).
3. **Browsers can't even connect** — a web page can only speak WebSocket,
   which was the whole point of a chat app.

## What changed in the refactor

- **`frames.js` is RFC 6455's framing as pure `Buffer → data` functions.**
  FIN/opcode byte, mask bit, 7-bit and 16-bit lengths, XOR unmasking.
  `decodeFrames(buffer)` returns complete frames *plus the partial tail*
  to carry into the next chunk — the test feeds two messages through **one
  byte at a time** and still gets two clean messages. The 64-bit length
  form is rejected loudly (honest limits beat silent corruption).
- **`handshake.js`**: the upgrade ritual — `SHA-1(key + magic GUID)`,
  base64. Tested against **the RFC's own sample vector**.
- **`server.js` separates transport from protocol**: it moves buffers
  between sockets and `frames.js`, answers pings with pongs, echoes the
  close handshake, treats socket errors as routine departures, and
  encodes each broadcast *once* for all clients.
- **The client handles the lifecycle demos skip**: reconnection with
  exponential backoff (project 43's policy in the browser), a
  `readyState` check before send, and `textContent` for incoming chat —
  chat messages are user input (project 35).

## Key takeaway

Every networked message system rests on one question: *where does one
message end and the next begin?* Length-prefixed framing is the answer,
WebSocket is just a standardized one, and `decodeFrames`'s
accumulate-and-carry loop is the shape of every protocol parser you'll
ever write. Separate it from the sockets and the protocol becomes a
library with tests instead of folklore in a data handler.
