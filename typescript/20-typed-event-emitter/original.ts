// js#38's EventEmitter, ported with string events and any payloads.
// The pub/sub pattern is intact; the CONTRACTS between publishers
// and subscribers are vibes.

type Listener = (...args: any[]) => void;

export class EventEmitter {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, ...args: any[]): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      listener(...args);
    }
  }
}

// A download manager using it:
const emitter = new EventEmitter();

emitter.on('progress', (percent: number) => {
  console.log(`${percent}%`);
});

emitter.on('done', (file: { name: string; size: number }) => {
  console.log(`${file.name} (${file.size} bytes)`);
});

// Every contract violation compiles:
emitter.emit('progress', 'fifty');        // string into a number listener
emitter.emit('done', { name: 'a.zip' });  // size missing -> "(undefined bytes)"
emitter.emit('progess', 50);              // TYPO'd event name: fires nothing,
                                          // silently — the worst one. The
                                          // listener waits forever and no
                                          // squiggle anywhere says why.
emitter.emit('done');                     // no payload at all -> crash in the
                                          // listener (file.name of undefined)
