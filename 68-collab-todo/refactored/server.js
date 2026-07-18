/**
 * The collaboration server = three earlier projects composed:
 *
 *   project 65's framework  -> the HTTP API (POST/PUT/DELETE todos)
 *   project 67's protocol   -> the WebSocket push pipe
 *   an EVENT LOG            -> the single source of truth
 *
 * Every mutation appends { version, type, todo, originTag } to the
 * log and broadcasts it. New/reconnecting clients say which version
 * they have (?since=N) and get a replay. Writes are fine-grained
 * operations, never "save the whole list" — small blast radius.
 *
 *   node 68-collab-todo/refactored/server.js
 *   -> open http://localhost:3000 in TWO windows; edit in both.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, jsonBody, HttpError } from '../../65-rest-api/refactored/app.js';
import { upgradeResponse } from '../../67-websocket-chat/refactored/handshake.js';
import { decodeFrames, encodeText, encodeFrame, OPCODES } from '../../67-websocket-chat/refactored/frames.js';

export function createCollabServer(port = 0) {
  // ---- truth: todos + the event log --------------------------------
  const todos = new Map();
  const eventLog = [];
  let nextId = 1;
  const sockets = new Set();

  function commit(type, data, originTag) {
    const event = { version: eventLog.length + 1, type, ...data, originTag };
    eventLog.push(event);
    const frame = encodeText(JSON.stringify(event));
    for (const s of sockets) s.write(frame); // push beats polling (project 67)
    return event;
  }

  // ---- the HTTP API (project 65's layering, compressed) ------------
  const app = createApp();
  app.use(jsonBody());

  app.get('/', (ctx) => {
    ctx.res.writeHead(200, { 'Content-Type': 'text/html' });
    ctx.res.end(fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html')));
  });

  app.get('/events', (ctx) => {
    const since = Number(ctx.query.get('since') ?? 0);
    ctx.json(200, eventLog.filter((e) => e.version > since));
  });

  app.post('/todos', (ctx) => {
    const { title, originTag } = ctx.body ?? {};
    if (typeof title !== 'string' || !title.trim()) {
      throw new HttpError(400, 'title must be a non-empty string');
    }
    const todo = { id: nextId++, title: title.trim().slice(0, 200), done: false };
    todos.set(todo.id, todo);
    ctx.json(201, commit('upsert', { todo }, originTag));
  });

  app.put('/todos/:id', (ctx) => {
    const id = Number(ctx.params.id);
    const existing = todos.get(id);
    if (!existing) throw new HttpError(404, `no todo ${id}`);
    const todo = { ...existing, done: !!ctx.body?.done };
    todos.set(id, todo);
    ctx.json(200, commit('upsert', { todo }, ctx.body?.originTag));
  });

  app.delete('/todos/:id', (ctx) => {
    const id = Number(ctx.params.id);
    if (!todos.delete(id)) throw new HttpError(404, `no todo ${id}`);
    ctx.json(200, commit('deleted', { todoId: id }, ctx.body?.originTag));
  });

  // ---- the push pipe (project 67's protocol) ------------------------
  const server = app.listen(port);
  server.on('upgrade', (req, socket) => {
    socket.write(upgradeResponse(req.headers['sec-websocket-key']));
    sockets.add(socket);

    // catch-up replay: the client tells us the last version it saw
    const since = Number(new URL(req.url, 'http://x').searchParams.get('since') ?? 0);
    for (const event of eventLog.filter((e) => e.version > since)) {
      socket.write(encodeText(JSON.stringify(event)));
    }

    let pending = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      let frames;
      try {
        ({ frames, rest: pending } = decodeFrames(Buffer.concat([pending, chunk])));
      } catch { return socket.destroy(); }
      for (const frame of frames) {
        if (frame.opcode === OPCODES.CLOSE) {
          socket.write(encodeFrame(OPCODES.CLOSE, frame.payload));
          socket.end();
        } else if (frame.opcode === OPCODES.PING) {
          socket.write(encodeFrame(OPCODES.PONG, frame.payload));
        }
        // clients never send edits over the socket: WRITES go through
        // HTTP (validated, error-shaped); the socket is a read-only
        // firehose. One door per direction.
      }
    });
    const drop = () => sockets.delete(socket);
    socket.on('close', drop);
    socket.on('error', drop);
  });

  return server;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const server = createCollabServer(3000);
  server.on('listening', () =>
    console.log('collab todos at http://localhost:3000 — open two windows'));
}
