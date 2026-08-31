// Typestate: don't put the state in a FIELD, put it in the TYPE.
// One object per lifecycle state, each offering exactly the
// operations that state allows — and every transition HANDS YOU the
// next state. ts#33 made the state machine's transitions checkable;
// this makes the machine's *handle* change type as it runs.

interface Socket {
  readonly url: string;
  open: boolean;
  readonly frames: string[];
}

// ==== the two states, as two types ================================
export interface Disconnected {
  readonly state: 'disconnected'; // discriminant (ts#10), for when
  readonly url: string; //           you hold the union
  connect(): Connected; // the ONLY operation, and it returns the
} //                       state you land in

export interface Connected {
  readonly state: 'connected';
  readonly url: string;
  send(message: string): Connected; // chainable: still connected
  close(): Disconnected; // hands back a handle that can't send
}

// No `connect()` on Connected. No `send()` or `close()` on
// Disconnected. The invalid call sequences aren't guarded — they're
// unspellable.

// ==== the implementation: one factory per state ===================
export function connection(url: string): Disconnected {
  return {
    state: 'disconnected',
    url,
    connect(): Connected {
      return connected({ url, open: true, frames: [] });
    },
  };
}

function connected(socket: Socket): Connected {
  const handle: Connected = {
    state: 'connected',
    url: socket.url,
    send(message: string): Connected {
      if (!socket.open) throw new Error('send(): stale handle, this socket was closed');
      socket.frames.push(message);
      return handle;
    },
    close(): Disconnected {
      socket.open = false;
      return connection(socket.url);
    },
  };
  return handle;
}

// ==== usage: the sequence is now the shape of the code ============
export function session(): string[] {
  const idle = connection('wss://example.test/feed');
  const live = idle.connect(); // Disconnected -> Connected
  live.send('hello').send('world'); // only Connected has send()
  const closed = live.close(); // Connected -> Disconnected
  return [idle.state, live.state, closed.state];
  // You cannot get to `send` without going through `connect`,
  // because `connect` is the only thing that produces a Connected.
}

// Holding the union is fine, and narrows on the discriminant:
export function describe(link: Disconnected | Connected): string {
  switch (link.state) {
    case 'disconnected':
      return `idle (${link.url})`;
    case 'connected':
      return `live (${link.url})`;
    default: {
      const impossible: never = link; // ts#12's exhaustiveness check
      return impossible;
    }
  }
}

// ==== the honest caveat ===========================================
// TypeScript has no LINEAR types: after `const closed = live.close()`
// the old `live` binding is still in scope, still typed Connected,
// and `live.send('x')` still compiles. The type system tracks what a
// handle CAN do, not how many times you may use it. Two mitigations,
// both in this file: transitions return the next handle so the
// natural style is to rebind (`let link = link.connect()`), and
// send() keeps ONE runtime check for the stale-alias case — the
// single guard left over from the original's four.

// ==== type tests: every original bug, now a compile error =========
const idle = connection('wss://example.test/feed');

// @ts-expect-error — eagerSend(): a Disconnected handle has no send()
idle.send('hello');

// @ts-expect-error — nothing to close before you connect
idle.close();

const live = idle.connect();

// @ts-expect-error — reconnectStorm(): Connected has no connect(); no
// second socket can be opened over the first
live.connect();

const closed = live.close();

// @ts-expect-error — useAfterClose(): close() handed back a Disconnected
closed.send('goodbye');

// @ts-expect-error — closeTwice(): and it can't be closed again either
closed.close();

export const trace = [idle.state, live.state, closed.state];
