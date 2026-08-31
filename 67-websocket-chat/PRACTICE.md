# 🏋️ Practice: Real-Time Chat (WebSockets from scratch)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. opcodeName (warm-up)

Write `opcodeName(opcode)` that turns a decoded frame's numeric opcode back into its name: `1 → 'TEXT'`, `8 → 'CLOSE'`, `9 → 'PING'`, `10 → 'PONG'`, anything else → `'UNKNOWN'`. Derive it from the exported `OPCODES` object rather than hard-coding a second table — one source of truth. Check: `opcodeName(decodeFrames(encodeText('hi')).frames[0].opcode)` is `'TEXT'`, and `opcodeName(0x7)` is `'UNKNOWN'`.

What it practices: reading `frames.js`'s vocabulary, and inverting a lookup table you already have.

Hint: `Object.entries(OPCODES).find(([, value]) => value === opcode)`.

### ⭐⭐ 2. The starved decoder — empty and tiny buffers (core)

`frames.test.js` feeds the decoder full messages and byte-by-byte splits, but never the degenerate inputs. Add a test covering three: `decodeFrames(Buffer.alloc(0))` yields no frames and an empty `rest`; `encodeText('')` (a real frame with a zero-byte payload — a legal WebSocket message) round-trips to one TEXT frame whose payload has length 0; and a lone first byte `Buffer.from([0x81])` yields no frames but a 1-byte `rest` — carried, not dropped.

What it practices: pinning the "not enough bytes yet" contract that the whole accumulate-and-carry design rests on.

Hint: three asserts per case: `frames` array, payload (where any), and `rest.length`.

### ⭐⭐ 3. The 125/126 length boundary (core)

The existing length test uses a 300-byte payload — far from the edge. Write the boundary test: a 125-byte payload must use the compact form (byte 1 equals 125, total frame length `2 + 125`), while a 126-byte payload must switch to the extended form (byte 1's low 7 bits equal 126, the true length lives in `readUInt16BE(2)`, total `4 + 126`). Assert both decode back to the right payload length.

What it practices: reading the bit layout in `frames.js`'s header comment and proving the format switch happens exactly where the RFC says.

Hint: `encoded[1] & 0x7f` extracts the 7-bit length field (the mask bit is 0 on server frames, but masking with `0x7f` documents intent).

### ⭐⭐ 4. createFrameReader — the carry loop, packaged (core)

`server.js` hand-wires the accumulate-and-carry dance (`pending`, `Buffer.concat`, destructure, repeat) for each socket. Package it: `createFrameReader()` returns `{ push(chunk) → frames[], buffered }`, hiding the `pending` buffer inside a closure. Check: pushing a two-message buffer in 5-byte slices yields exactly `['hi bob!', 'want lunch?']` with `buffered` ending at 0; pushing 3 bytes of a frame returns `[]` with `buffered === 3`, and pushing the remainder returns the completed frame.

What it practices: turning a recurring wiring pattern into a small stateful abstraction — the shape of every protocol-parser API.

Hint: the entire body of `push` is the three lines from `server.js`'s data handler, with `pending` as closure state.

### ⭐⭐⭐ 5. Close frames with status codes (challenge)

RFC 6455 close payloads carry a 2-byte big-endian status code plus an optional UTF-8 reason (1000 = normal, 1001 = going away). Write `encodeClose(code = 1000, reason = '')` building that payload via `encodeFrame(OPCODES.CLOSE, ...)`, and `parseClose(payload)` returning `{ code, reason }` — with an empty payload mapping to `{ code: 1005, reason: '' }` (the RFC's "no status received" sentinel). Check: `encodeClose(1001, 'going away')` round-trips through `decodeFrames` to `{ code: 1001, reason: 'going away' }`, and the raw bytes `[0x03, 0xe8]` from the existing control-frames test parse as code 1000.

What it practices: layering meaning *inside* a payload — the frame layer carries bytes; what they mean is another, smaller protocol.

Hint: `Buffer.alloc(2)` + `writeUInt16BE(code, 0)`, then `Buffer.concat` with the reason; parse with `readUInt16BE(0)` and `subarray(2)`.

### ⭐⭐⭐ 6. Fragmentation — the FIN bit earns its keep (challenge)

`decodeFrames` reads the FIN bit's byte but throws the flag away — which is why the refactor can't do fragmented messages (FIN=0 first frame, opcode-0 continuations, FIN=1 last). Build the missing trio for the unmasked, under-126-byte case: `encodeFragmented(text, size)` (first fragment opcode TEXT, rest opcode `0x0`, only the last with bit `0x80`), `decodeFinFrames(buffer)` (like `decodeFrames` but each frame keeps `fin`), and `assembleText(frames)` (buffer payloads until a `fin: true` frame completes a message). Check: a 58-char string fragmented at size 10 decodes to 6 frames — first opcode 1, rest opcode 0, only the last with `fin: true` — and reassembles to the exact original; a fragmented message followed by a normal `encodeText` frame on the same wire yields both messages.

What it practices: extending a binary protocol by re-reading its bit layout — and seeing why dropping a header bit closes a door.

Hint: header byte is `fin | opcode` where `fin` is `0x80` or `0x00`; in the decoder, `(buffer[off] & 0x80) !== 0` recovers it.

## Solutions

### 1. opcodeName

```js
export function opcodeName(opcode) {
  const entry = Object.entries(OPCODES).find(([, value]) => value === opcode);
  return entry ? entry[0] : 'UNKNOWN';
}
```

WHY: Inverting `OPCODES` at the point of use keeps one source of truth — add an opcode to the table and this function already knows it, where a duplicate `switch` would silently drift. `'UNKNOWN'` instead of `undefined` follows the project's honesty rule: unexpected wire data gets named, not ignored. Handy in `server.js` logging when you're debugging who sent what.

### 2. The starved-decoder test

```js
test('empty and partial inputs: nothing invented, nothing lost', () => {
  const empty = decodeFrames(Buffer.alloc(0));
  assert.deepEqual(empty.frames, []);
  assert.equal(empty.rest.length, 0);

  const zero = decodeFrames(encodeText(''));      // legal: a 0-byte message
  assert.equal(zero.frames.length, 1);
  assert.equal(zero.frames[0].payload.length, 0);
  assert.equal(zero.rest.length, 0);

  const half = decodeFrames(Buffer.from([0x81])); // half a header
  assert.deepEqual(half.frames, []);
  assert.equal(half.rest.length, 1);              // carried, not dropped
});
```

WHY: The decoder's contract has two halves — "emit only complete frames" and "lose nothing" — and the second half is only visible at starved inputs like these. The 1-byte case guards the exact `buffer.length < 2` early-exit that makes byte-at-a-time feeding work; if a refactor ever returned a fresh empty buffer instead of the tail, every test with whole messages would still pass while real TCP traffic corrupted.

### 3. The length-boundary test

```js
test('125 stays compact; 126 switches to the extended form', () => {
  const small = encodeText('x'.repeat(125));
  assert.equal(small[1] & 0x7f, 125);
  assert.equal(small.length, 2 + 125);
  assert.equal(decodeFrames(small).frames[0].payload.length, 125);

  const big = encodeText('x'.repeat(126));
  assert.equal(big[1] & 0x7f, 126);          // the marker, not a length
  assert.equal(big.readUInt16BE(2), 126);    // the real length
  assert.equal(big.length, 4 + 126);
  assert.equal(decodeFrames(big).frames[0].payload.length, 126);
});
```

WHY: 126 is where the wire format physically changes shape — the single point where the value in byte 1 stops meaning "length" and starts meaning "look further." An off-by-one in either encoder or decoder shows up only in the 125/126 pair, which a 300-byte test sails past. Boundary tests are cheap insurance on exactly the math a 2am refactor gets wrong.

### 4. createFrameReader

```js
export function createFrameReader() {
  let pending = Buffer.alloc(0);
  return {
    push(chunk) {
      const { frames, rest } = decodeFrames(Buffer.concat([pending, chunk]));
      pending = rest;
      return frames;
    },
    get buffered() { return pending.length; },
  };
}
```

WHY: This is `server.js`'s per-socket wiring promoted to an abstraction: the closure owns `pending`, so a caller *can't* forget to carry the tail — the mistake that recreates the original's bug. The pure/stateful split stays clean: `decodeFrames` remains a testable pure function, and the reader is the thinnest possible stateful shell around it. Every real protocol library (HTTP parsers, LSP readers) exposes exactly this push-chunks-get-messages shape.

### 5. Close status codes

```js
export function encodeClose(code = 1000, reason = '') {
  const payload = Buffer.concat([Buffer.alloc(2), Buffer.from(reason)]);
  payload.writeUInt16BE(code, 0);
  return encodeFrame(OPCODES.CLOSE, payload);
}

export function parseClose(payload) {
  if (payload.length < 2) return { code: 1005, reason: '' }; // RFC: no status received
  return { code: payload.readUInt16BE(0), reason: payload.subarray(2).toString() };
}
```

WHY: The frame layer says "these bytes are a CLOSE"; what the bytes *mean* is a second, two-field format nested inside the payload — protocols are layered all the way down. Reusing `encodeFrame` keeps all header knowledge in one place, and `parseClose` decodes the same `[0x03, 0xe8]` the existing test ships raw, connecting the mystery constant to its meaning (1000, normal closure). The 1005 sentinel for empty payloads is the RFC's own "absence is information" move.

### 6. Fragmentation

```js
export function encodeFragmented(text, size) {
  const bytes = Buffer.from(text);
  const parts = [];
  for (let i = 0; i < bytes.length; i += size) parts.push(bytes.subarray(i, i + size));
  return Buffer.concat(parts.map((part, i) => {
    if (part.length >= 126) throw new RangeError('fragments must stay under 126 bytes');
    const fin = i === parts.length - 1 ? 0x80 : 0x00;
    const opcode = i === 0 ? OPCODES.TEXT : 0x0; // 0x0 = continuation
    return Buffer.concat([Buffer.from([fin | opcode, part.length]), part]);
  }));
}

export function decodeFinFrames(buffer) { // unmasked, len < 126 — keeps FIN
  const frames = [];
  let off = 0;
  while (off + 2 <= buffer.length) {
    const fin = (buffer[off] & 0x80) !== 0;
    const opcode = buffer[off] & 0x0f;
    const len = buffer[off + 1] & 0x7f;
    if (off + 2 + len > buffer.length) break;
    frames.push({ fin, opcode, payload: buffer.subarray(off + 2, off + 2 + len) });
    off += 2 + len;
  }
  return { frames, rest: buffer.subarray(off) };
}

export function assembleText(frames) {
  const messages = [];
  let parts = [];
  for (const f of frames) {
    parts.push(f.payload);
    if (f.fin) {
      messages.push(Buffer.concat(parts).toString());
      parts = [];
    }
  }
  return messages;
}
```

WHY: The exercise's real lesson is architectural: `decodeFrames` discarding FIN was a *scope decision* (single-frame messages only), and extending the protocol means going back to the bit layout, not bolting logic on top. `encodeFragmented` shows how one logical message becomes several wire frames — `0x80 | opcode` versus bare `opcode` is the entire difference between "done" and "more coming." `assembleText` is accumulate-and-carry one level up: buffering *frames into messages* exactly as `decodeFrames` buffers *bytes into frames* — the same pattern at two zoom levels, which is why the README calls it the shape of every protocol parser.
