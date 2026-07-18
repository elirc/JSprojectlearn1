/**
 * The chat server: an HTTP server that serves the client page, plus
 * an 'upgrade' handler that speaks the protocol from frames.js and
 * handshake.js. Real browsers connect to this — no libraries.
 *
 *   node 67-websocket-chat/refactored/server.js
 *   -> open http://localhost:3000 in TWO windows and chat
 *
 * Protocol and transport stay separated: this file moves buffers
 * between sockets and frames.js; it never peeks inside a frame
 * byte-by-byte itself.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { upgradeResponse } from './handshake.js';
import { decodeFrames, encodeText, encodeFrame, OPCODES } from './frames.js';

const clients = new Set();

export function createChatServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html')));
  });

  server.on('upgrade', (req, socket) => {
    if (req.headers.upgrade?.toLowerCase() !== 'websocket') return socket.destroy();

    socket.write(upgradeResponse(req.headers['sec-websocket-key']));
    clients.add(socket);
    broadcast(`* someone joined (${clients.size} online)`);

    // The original's bug, fixed: accumulate bytes, parse complete
    // frames, keep the partial tail for next time.
    let pending = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      let frames;
      try {
        ({ frames, rest: pending } = decodeFrames(Buffer.concat([pending, chunk])));
      } catch {
        socket.destroy(); // oversized/garbage framing: drop the connection
        return;
      }
      for (const frame of frames) {
        if (frame.opcode === OPCODES.TEXT) {
          broadcast(frame.payload.toString().slice(0, 500));
        } else if (frame.opcode === OPCODES.CLOSE) {
          // close is a HANDSHAKE: echo it, then end. The other side
          // knows we heard them — no one lingers half-open.
          socket.write(encodeFrame(OPCODES.CLOSE, frame.payload));
          socket.end();
        } else if (frame.opcode === OPCODES.PING) {
          socket.write(encodeFrame(OPCODES.PONG, frame.payload)); // keepalives answered
        }
      }
    });

    const drop = () => {
      if (clients.delete(socket)) broadcast(`* someone left (${clients.size} online)`);
    };
    socket.on('close', drop);
    socket.on('error', drop); // a vanished client is routine, not a crash
  });

  return server;
}

function broadcast(text) {
  const frame = encodeText(text); // encode ONCE, write to all
  for (const socket of clients) socket.write(frame);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  createChatServer().listen(3000, () =>
    console.log('chat at http://localhost:3000 — open it in two windows'));
}
