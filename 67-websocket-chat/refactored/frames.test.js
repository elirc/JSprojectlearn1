import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeFrame, encodeText, encodeMaskedFrame, decodeFrames, OPCODES,
} from './frames.js';
import { acceptKey } from './handshake.js';

test("RFC 6455's own handshake vector", () => {
  // Straight from the spec, section 1.3:
  assert.equal(acceptKey('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});

test('a text frame round-trips', () => {
  const { frames, rest } = decodeFrames(encodeText('hi bob!'));
  assert.equal(frames.length, 1);
  assert.equal(frames[0].opcode, OPCODES.TEXT);
  assert.equal(frames[0].payload.toString(), 'hi bob!');
  assert.equal(rest.length, 0);
});

test('masked (client-style) frames decode — the XOR unmasking works', () => {
  const { frames } = decodeFrames(encodeMaskedFrame(OPCODES.TEXT, 'want to get lunch?'));
  assert.equal(frames[0].payload.toString(), 'want to get lunch?');
});

test("THE ORIGINAL'S BUG, FIXED both ways: coalesced and split delivery", () => {
  const two = Buffer.concat([encodeText('hi bob!'), encodeText('want lunch?')]);

  // coalesced: two frames in one chunk -> two distinct messages
  const coalesced = decodeFrames(two);
  assert.deepEqual(coalesced.frames.map((f) => f.payload.toString()),
    ['hi bob!', 'want lunch?']);

  // split: the same bytes ONE AT A TIME -> still two clean messages
  let pending = Buffer.alloc(0);
  const seen = [];
  for (const byte of two) {
    const { frames, rest } = decodeFrames(Buffer.concat([pending, Buffer.from([byte])]));
    seen.push(...frames.map((f) => f.payload.toString()));
    pending = rest;
  }
  assert.deepEqual(seen, ['hi bob!', 'want lunch?']);
  assert.equal(pending.length, 0);
});

test('the 126 extended length form: a 300-byte payload survives', () => {
  const big = 'x'.repeat(300);
  const encoded = encodeText(big);
  assert.equal(encoded[1] & 0x7f, 126); // uses the extended form
  const { frames } = decodeFrames(encoded);
  assert.equal(frames[0].payload.toString(), big);

  const maskedBig = encodeMaskedFrame(OPCODES.TEXT, big);
  assert.equal(decodeFrames(maskedBig).frames[0].payload.toString(), big);
});

test('control frames: close and ping carry opcodes and payloads', () => {
  const close = decodeFrames(encodeFrame(OPCODES.CLOSE, Buffer.from([0x03, 0xe8])));
  assert.equal(close.frames[0].opcode, OPCODES.CLOSE);
  const ping = decodeFrames(encodeFrame(OPCODES.PING, 'alive?'));
  assert.equal(ping.frames[0].opcode, OPCODES.PING);
  assert.equal(ping.frames[0].payload.toString(), 'alive?');
});

test('oversized frames are a LOUD error, not silent corruption', () => {
  assert.throws(() => encodeText('x'.repeat(70_000)), RangeError);
  // a 127-length header (64-bit form) on the wire:
  const evil = Buffer.from([0x81, 127, 0, 0, 0, 0, 0, 0, 0, 1]);
  assert.throws(() => decodeFrames(evil), RangeError);
});
