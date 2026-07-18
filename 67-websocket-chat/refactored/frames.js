/**
 * WebSocket framing (RFC 6455), the readable subset: text, close,
 * ping/pong; payloads up to 64KB (the 127/64-bit length form is
 * rejected loudly, not silently mangled).
 *
 * A frame:
 *
 *   byte 0: FIN(1) RSV(3) OPCODE(4)        0x81 = final text frame
 *   byte 1: MASK(1) LEN(7)                 len<126: it IS the length
 *                                          len=126: next 2 bytes are (BE)
 *   [2 or 4 bytes: extended length]
 *   [4 bytes: mask key — client->server frames MUST be masked]
 *   payload (XOR'd with the repeating mask key when masked)
 *
 * Everything here is pure Buffer -> data. No sockets, no HTTP —
 * which is why the protocol has a test file and the original's
 * "protocol" (none) could not.
 */

export const OPCODES = { TEXT: 0x1, CLOSE: 0x8, PING: 0x9, PONG: 0xa };

/** Build a server->client frame (unmasked, as the RFC requires). */
export function encodeFrame(opcode, payload = Buffer.alloc(0)) {
  if (typeof payload === 'string') payload = Buffer.from(payload);
  if (payload.length > 65535) throw new RangeError('payloads over 64KB not supported');

  const header = payload.length < 126
    ? Buffer.from([0x80 | opcode, payload.length])
    : Buffer.concat([
        Buffer.from([0x80 | opcode, 126]),
        (() => { const b = Buffer.alloc(2); b.writeUInt16BE(payload.length); return b; })(),
      ]);
  return Buffer.concat([header, payload]);
}

export const encodeText = (text) => encodeFrame(OPCODES.TEXT, text);

/** Build a client->server frame (masked) — used by tests to play
 *  the browser's role without a browser. */
export function encodeMaskedFrame(opcode, payload, maskKey = Buffer.from([1, 2, 3, 4])) {
  if (typeof payload === 'string') payload = Buffer.from(payload);
  if (payload.length > 65535) throw new RangeError('payloads over 64KB not supported');

  const masked = Buffer.from(payload.map((byte, i) => byte ^ maskKey[i % 4]));
  const lenPart = payload.length < 126
    ? Buffer.from([0x80 | payload.length])
    : Buffer.concat([
        Buffer.from([0x80 | 126]),
        (() => { const b = Buffer.alloc(2); b.writeUInt16BE(payload.length); return b; })(),
      ]);
  return Buffer.concat([Buffer.from([0x80 | opcode]), lenPart, maskKey, masked]);
}

/**
 * The receive half — and the fix for the original's core bug.
 * TCP hands us arbitrary chunks; we ACCUMULATE and only emit frames
 * whose bytes have fully arrived:
 *
 *   decodeFrames(buffer) -> { frames: [{opcode, payload}], rest }
 *
 * `rest` is the partial tail to prepend to the next chunk. Feed this
 * function one byte at a time and it still parses perfectly (the
 * test does exactly that).
 */
export function decodeFrames(buffer) {
  const frames = [];

  while (true) {
    if (buffer.length < 2) break;

    const opcode = buffer[0] & 0x0f;
    const masked = (buffer[1] & 0x80) !== 0;
    let len = buffer[1] & 0x7f;
    let offset = 2;

    if (len === 127) throw new RangeError('payloads over 64KB not supported');
    if (len === 126) {
      if (buffer.length < 4) break;
      len = buffer.readUInt16BE(2);
      offset = 4;
    }

    const maskKey = masked ? buffer.subarray(offset, offset + 4) : null;
    if (masked) offset += 4;

    if (buffer.length < offset + len) break; // frame not all here yet — wait

    let payload = buffer.subarray(offset, offset + len);
    if (masked) payload = Buffer.from(payload.map((byte, i) => byte ^ maskKey[i % 4]));

    frames.push({ opcode, payload });
    buffer = buffer.subarray(offset + len);
  }

  return { frames, rest: buffer };
}
