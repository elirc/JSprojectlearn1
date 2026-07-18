// Project 38 built a solid sync emitter. Then the app around it went
// async, and three new failure modes showed up. This file plays them
// out with a fake reconnecting chat client.
import { EventEmitter } from "../38-event-emitter/refactored/emitter.js";

var bus = new EventEmitter();

// ---- Failure mode 1: waiting for an event by POLLING ----------------
// "Wait until we're connected, then send." There's no way to await an
// event, so... a spin loop with sleeps. Wasteful, laggy (up to 100ms
// late), and if the event never comes it polls FOREVER — no timeout.
var connected = false;
bus.on("connected", function () { connected = true; });

async function sendWhenConnected(msg) {
  while (!connected) {
    await new Promise(function (r) { setTimeout(r, 100); });
  }
  console.log("sent:", msg);
}

// ---- Failure mode 2: the forgotten unsubscribe = a LEAK -------------
// Every reconnect wires up handlers for the new session... without
// tearing down the old ones. Old handlers keep firing (duplicate
// message processing!) and keep every dead session object alive in
// memory via the closure. The count below just keeps climbing.
function startSession(sessionId) {
  var sessionData = { id: sessionId, buffer: [] }; // retained forever
  bus.on("message", function (m) {
    sessionData.buffer.push(m); // ALL past sessions still push!
  });
  // ...disconnect happens, reconnect calls startSession again,
  // and nobody kept the unsubscribe handle 38 so carefully returned.
}

// ---- Failure mode 3: async listeners fire-and-forget ----------------
// The emitter calls listeners synchronously. An ASYNC listener returns
// a promise nobody looks at: emit() returns before the work is done
// (ordering bugs), and a rejection becomes an unhandled-rejection
// CRASH — watch this very file die at the end, with a stack trace
// pointing nowhere near the emit() that caused it.
bus.on("save", async function (doc) {
  await new Promise(function (r) { setTimeout(r, 10); });
  if (!doc.title) throw new Error("untitled docs are unsaveable");
});

async function main() {
  startSession(1);
  startSession(2);
  startSession(3);
  console.log("message listeners after 3 reconnects:", bus.listenerCount("message")); // 3, should be 1

  bus.emit("message", "hi"); // processed by three dead sessions

  setTimeout(function () { bus.emit("connected"); }, 250);
  await sendWhenConnected("hello"); // works, via ~3 polls

  bus.emit("save", {}); // the async listener will reject...
  console.log("emit('save') returned before the save even ran");
  // ...and ~10ms later the rejection kills the process. THE END.
}

main();
