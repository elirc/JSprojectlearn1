# 📘 Learning Guide: Real-Time Chat (WebSockets from scratch)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A chat room. Run `node 67-websocket-chat/refactored/server.js`, open `http://localhost:3000` in **two** browser windows, and type in either one — messages appear instantly in both, plus little system notes like `* someone joined (2 online)`. Kill the server and the pages say "disconnected — retrying in 0.5s"; restart it and they reconnect by themselves.

The impressive part: it uses **zero libraries**. The server implements the actual WebSocket protocol — the same one real browsers speak — by hand, in about 200 readable lines. Everything runs on localhost, so it works perfectly offline on the plane.

The original file (`node 67-websocket-chat/original.js`) is a raw TCP chat that demos its own fatal bug: two messages sent separately arrive *fused into one*.

## 2. Concepts you need first

**TCP** is the internet's reliable pipe. When two programs connect, each can write bytes in and read bytes out, in order, with nothing lost. Node's `net` module speaks it:

```js
import net from "node:net";
const server = net.createServer((socket) => {
  socket.on("data", (chunk) => console.log("got bytes:", chunk.toString()));
});
server.listen(4000);
```

A **socket** is one live connection — an object you can `.write()` to and receive `'data'` events from. A **byte** is one unit of raw data (a number 0–255); a **Buffer** is Node's container for a bunch of bytes.

**THE key fact this whole project hangs on: TCP is a *stream*, not a mail service.** You write bytes in; the other side receives bytes out — but TCP promises nothing about *groupings*. Write `"hi"` then `"bye"`, and the receiver's `'data'` event may fire once with `"hibye"`, or twice, or with `"hib"` then `"ye"`. Only the byte *order* is guaranteed. Any code that assumes "one data event = one message" is betting on luck.

**Framing** is the fix: an agreed rule for where messages begin and end. The most common rule is **length-prefixing** — before each message, send its length:

```js
// "3hi!" means: next 3 bytes are one message → "hi!"
// Receiver logic: read length, wait until that many bytes have
// arrived (however many chunks that takes), emit ONE message, repeat.
```

The receiver **accumulates** chunks in a buffer and only emits a message once all its bytes are present, carrying leftover bytes into the next round. This "accumulate and carry" loop is the heart of every network protocol parser ever written.

**Bits, hex, and bitwise operators** (the protocol is defined at the bit level, so you need a little of this):
- A byte is 8 **bits** (0s/1s). Hex notation `0x81` is shorthand for the bits `1000 0001`.
- `a & b` (AND) keeps only bits set in both — used to *extract* bits: `0x81 & 0x0f` → `0x01` (the low 4 bits).
- `a | b` (OR) combines bits — used to *build* bytes: `0x80 | 0x1` → `0x81`.
- `a ^ b` (XOR) flips bits where `b` has 1s. XOR's magic: applying the same mask twice returns the original — `(x ^ k) ^ k === x`. So XOR is a reversible scrambler:

```js
console.log(5 ^ 3);        // 6
console.log((5 ^ 3) ^ 3);  // 5 — unscrambled by re-applying
```

**HTTP and the Upgrade handshake.** Browsers can't open raw TCP sockets (a security rule). What a web page *can* do is speak **WebSocket**: it starts as an ordinary HTTP request containing `Upgrade: websocket` and a random `Sec-WebSocket-Key` header. If the server answers `101 Switching Protocols` with the correct `Sec-WebSocket-Accept` value — computed as `base64(SHA-1(key + a fixed magic GUID))` — both sides stop speaking HTTP and start exchanging WebSocket **frames** over the same connection. The silly-looking ritual exists to prove the server genuinely speaks WebSocket (a confused ordinary HTTP server would never produce the right value). SHA-1 is a hash function (a one-way fingerprint — see project 66); a GUID is just a long unique ID string; base64 writes bytes as safe text.

**WebSocket frames.** Each message travels in a frame: a 2+ byte header, then the payload. The header packs in: FIN (is this the final piece?), an **opcode** (what kind of frame: `0x1` text, `0x8` close, `0x9` ping, `0xA` pong), a MASK bit, and the payload length (with an extended 2-byte form for lengths ≥126). Client→server frames must be **masked**: XOR'd with a random 4-byte key that's included in the frame (an anti-cache-poisoning rule from the spec — the server just unmasks). **Ping/pong** are built-in "you alive?" heartbeats; **close** is a two-way goodbye handshake so neither side is left wondering. All of this is defined in **RFC 6455** — an RFC is a published internet standard document.

**The browser side** is one built-in class:

```js
const ws = new WebSocket("ws://localhost:3000");
ws.onopen    = () => ws.send("hello");
ws.onmessage = (e) => console.log("got:", e.data);
ws.onclose   = () => console.log("connection gone");
```

**Exponential backoff** = when reconnecting, wait 0.5s, then 1s, 2s, 4s... doubling each failure (with a cap), so a dead server isn't hammered by retries.

## 3. Walking through the original code

```js
var clients = [];
var server = net.createServer(function (socket) {
  clients.push(socket);
```

A raw TCP server; every connection gets remembered in an array.

```js
socket.on("data", function (chunk) {
  var message = chunk.toString(); // maybe 0.5 messages. maybe 3.
  for (var i = 0; i < clients.length; i++) {
    if (clients[i] !== socket) clients[i].write(message);
  }
});
```

The fatal line is the comment's own admission: it treats one `'data'` event as one message and re-broadcasts the chunk to everyone else. No framing anywhere.

```js
setTimeout(function () {
  alice.write("hi bob!");
  alice.write("want to get lunch?");
}, 50);
```

The demo at the bottom connects two fake clients and has alice send two separate messages back-to-back. TCP coalesces them, and bob receives **one** blob: `"hi bob!want to get lunch?"` — the file proves its own bug when you run it.

There's also no `'error'` listener (a vanished client crashes the server with ECONNRESET), no way to detect dead connections (they linger in `clients` forever), and — problem 3 — **no browser can connect at all**, since pages can only speak WebSocket. A chat app with no web client.

## 4. What's wrong with it (in beginner terms)

**1. "1 data event = 1 message" is a lie that works in demos.** On localhost, messages are small and fast, so they *usually* arrive as sent — you test it, it works, you ship it. In production, real networks split big writes and fuse small ones constantly. Story: your chat works for weeks, then a user on hotel Wi-Fi sends a long message; it arrives as two chunks; everyone sees two half-messages; another user's two quick messages fuse into gibberish. The bug is unreproducible on your machine — the worst kind.

**2. No protocol means no lifecycle.** When someone's laptop lid closes, their socket dies silently. Without ping/pong, that dead socket stays in `clients` forever — the server writes into the void and the list grows stale. And without an `'error'` handler, one abruptly-vanished client (ECONNRESET = "connection reset by peer") throws an uncaught error and kills the whole server. One phone in a tunnel takes down the chat room.

**3. Browsers are locked out.** Web pages cannot open raw TCP — the browser only offers WebSocket. So this "chat server" can never have a web page as a client, which was the entire point.

## 5. Try it yourself first!

Hints, vague to specific:

1. How could the receiver know where one message ends? What would sender and receiver have to agree on?
2. Prefix each message with its length. Now the receiver must handle a chunk containing *part* of a message — what do you do with bytes you can't parse yet?
3. Keep a `pending` Buffer per socket. On each `'data'`: concat, parse out every *complete* message, keep the remainder in `pending`.
4. For real browsers: read the WebSocket frame layout in the header comment of `refactored/frames.js` — byte 0 is FIN+opcode, byte 1 is mask-bit+length, maybe extended length, maybe 4 mask bytes, then payload. Try writing just the decoder.
5. The handshake: respond to the HTTP Upgrade with `101 Switching Protocols` and `Sec-WebSocket-Accept: base64(sha1(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))`. Node's `crypto.createHash('sha1')` does the work.
6. Add `socket.on('error', ...)` that just removes the client — a vanished client is routine, not a crash.

## 6. Understanding the refactored solution

Three files, each doing one job — that separation is itself the lesson.

**`frames.js` — the protocol, as pure functions.** No sockets, no HTTP; just `Buffer → data`. `encodeFrame(opcode, payload)` builds a server→client frame: first byte `0x80 | opcode` (FIN bit + opcode), then the length (raw if <126, else marker 126 + 2 bytes), then the payload. `encodeMaskedFrame` builds the client-style masked version (XOR with a 4-byte key) — it exists so *tests* can play the browser's role. Frames over 64KB are rejected with a loud `RangeError` rather than parsed wrongly — "honest limits beat silent corruption."

The star is `decodeFrames(buffer) → { frames, rest }`:

```js
if (buffer.length < offset + len) break; // frame not all here yet — wait
```

It loops, pulling out every frame whose bytes have *fully* arrived, and returns whatever's left over as `rest`. The caller keeps `rest` and prepends it to the next chunk. That's the accumulate-and-carry pattern that fixes the original's core bug — and because it's a pure function, it has a real test file, which a tangle of socket callbacks never could.

**`handshake.js`** — ten lines: `acceptKey` computes the SHA-1 ritual; `upgradeResponse` formats the `101 Switching Protocols` reply (HTTP headers end with a blank line, hence the `'', ''`).

**`server.js` — transport only.** An ordinary HTTP server serves `index.html`; the `'upgrade'` event hands over sockets that asked for WebSocket. Per socket:

```js
let pending = Buffer.alloc(0);
socket.on('data', (chunk) => {
  ({ frames, rest: pending } = decodeFrames(Buffer.concat([pending, chunk])));
```

— the carry loop in action. Then it dispatches by opcode: TEXT → broadcast (capped at 500 chars); CLOSE → echo the close frame and end (the polite two-way goodbye); PING → answer PONG. `broadcast` encodes the frame **once** and writes the same bytes to every client. Both `'close'` and `'error'` funnel into one `drop()` that removes the client and announces the departure — a vanished client is now routine. Note the server never fingers frame bytes itself; protocol knowledge lives only in `frames.js`.

**`index.html` — the client.** Uses the built-in `WebSocket` class plus the lifecycle work demos skip: a `connect()` function that re-arms itself in `onclose` with exponential backoff (`500 * 2 ** attempt`, capped at 8s; a successful open resets `attempt`), a `readyState` check before sending (sends on a closed socket throw — here we drop with a status message instead), and `line.textContent = event.data` for display. `textContent` treats the message as plain text; using `innerHTML` would let another user *inject HTML/script into your page* — chat messages are untrusted user input.

**`frames.test.js`** checks the handshake against **the RFC's own published sample values**, round-trips plain and masked frames, exercises the 126 length form with a 300-byte payload, and — the showpiece — encodes two messages, then feeds the bytes to `decodeFrames` **one byte at a time**, asserting both messages still come out clean. It also proves oversized frames throw instead of corrupting. Run with `node --test 67-websocket-chat/` — all offline.

## 7. Words you learned (glossary)

- **TCP** — the reliable ordered byte-pipe underlying most internet traffic.
- **socket** — one live connection you can write to / read from.
- **byte / Buffer** — one 0–255 unit of data / Node's container for many of them.
- **byte stream** — bytes in order with *no* message boundaries preserved.
- **coalesce / split** — TCP fusing separate writes into one chunk / cutting one write into several.
- **framing** — an agreed rule marking where messages begin and end.
- **length-prefix** — framing by sending a message's size before its bytes.
- **accumulate-and-carry** — buffer incoming chunks, parse complete messages, keep the partial tail.
- **WebSocket** — the standard two-way message protocol browsers can speak.
- **RFC / RFC 6455** — a published internet standard / the one defining WebSocket.
- **handshake (upgrade)** — the HTTP request/101 response that switches a connection to WebSocket.
- **GUID** — a long globally-unique ID string (here, a fixed constant from the spec).
- **SHA-1 / base64** — a hash (fingerprint) function / a bytes-as-text encoding.
- **frame** — one unit on the wire: header (FIN, opcode, mask, length) + payload.
- **opcode** — the frame-type number: text 0x1, close 0x8, ping 0x9, pong 0xA.
- **masking** — client frames XOR'd with a random key (included in the frame) per the spec.
- **XOR (`^`)** — bit-flipper; applying the same key twice restores the original.
- **bitwise AND / OR (`&`, `|`)** — extract bits from / pack bits into a byte.
- **hex (0x81)** — base-16 shorthand for byte values.
- **ping/pong** — built-in heartbeat frames to detect dead connections.
- **close handshake** — the echoed close frame; both sides know the goodbye was heard.
- **ECONNRESET** — the error when the far side vanishes abruptly.
- **broadcast** — sending one message to every connected client.
- **exponential backoff** — doubling the wait between reconnection attempts.
- **readyState** — the WebSocket's current status (CONNECTING/OPEN/CLOSING/CLOSED).
- **textContent vs innerHTML** — safe plain-text display vs interpreting a string as HTML (dangerous with user input).

## 8. Experiments to try on the plane (no internet needed)

Localhost servers and Node tests are fully offline. Start with `node 67-websocket-chat/refactored/server.js` and two browser windows at `http://localhost:3000`.

1. **See the original's bug with your own eyes.** Run `node 67-websocket-chat/original.js`. Expected output: bob receives `"hi bob!want to get lunch?"` — two messages fused. Then re-run it a few times; on some machines you may occasionally see them arrive separately. That inconsistency IS the lesson.
2. **Watch reconnection work.** With two chat windows open, press Ctrl+C on the server. Expected: both pages count down retries with growing delays (0.5s, 1s, 2s...). Restart the server; both reconnect and announce joins.
3. **Add usernames.** In `index.html`, change the send line to `ws.send('ada: ' + input.value.trim())` (or prompt for a name first). Expected: messages appear prefixed in both windows — and note the *server* needed no change, because to the server a message is just text.
4. **Prove the byte-at-a-time claim yourself.** In `frames.test.js`'s split test, change the loop to feed 3 bytes at a time (`for (let i = 0; i < two.length; i += 3)` with `two.subarray(i, i + 3)`). Expected: `node --test 67-websocket-chat/` still passes — the decoder doesn't care how bytes are grouped.
5. **Break the handshake and watch the browser refuse.** In `handshake.js`, change one character of the magic GUID. Expected: the page loads but never connects (the status stays "connecting…" and retries forever) — the browser checks the accept value and rejects impostors. Undo it after!
