// One class, three lifecycle states, and no way to tell them apart.
// `Connection` offers connect(), send() and close() from the moment
// it is constructed to the moment it is garbage collected.

interface Socket {
  readonly url: string;
  open: boolean;
  readonly frames: string[];
}

export class Connection {
  private socket: Socket | null = null;

  constructor(private readonly url: string) {}

  connect(): void {
    this.socket = { url: this.url, open: true, frames: [] };
  }

  send(message: string): void {
    // The `null` in the field type is the entire lifecycle, smuggled
    // into a runtime check — ts#33's transition table, but written
    // as an `if` nobody can see from a call site:
    if (this.socket === null || !this.socket.open) {
      throw new Error('send(): not connected');
    }
    this.socket.frames.push(message);
  }

  close(): void {
    if (this.socket !== null) this.socket.open = false;
    this.socket = null;
  }
}

const feed = new Connection('wss://example.test/feed');

export function eagerSend(): void {
  feed.send('hello'); // compiles. Error: send(): not connected.
}

export function useAfterClose(): void {
  feed.connect();
  feed.send('hello'); // fine
  feed.close();
  feed.send('goodbye'); // compiles. Throws. The classic.
}

export function reconnectStorm(): void {
  feed.connect();
  feed.connect();
  // compiles, throws nothing, and quietly abandons the first socket:
  // its frames are gone, its listeners leak, and the bug shows up
  // days later as "messages sometimes disappear".
}

export function closeTwice(): void {
  feed.close();
  feed.close(); // compiles; a harmless no-op that hides a real
  // ordering mistake somewhere upstream, because nothing complains.
}

// Every one of these is a SEQUENCE error: the calls are individually
// well-typed and collectively nonsense. The type `Connection` is the
// same object before connecting, while connected, and after closing,
// so the compiler has no way to know which one you're holding — and
// send()'s `throw` is left to explain it, in production, one call
// stack away from the mistake.
