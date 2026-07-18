// The typed emitter: the class is GENERIC OVER AN EVENT MAP — an
// interface listing each event name and its payload type. ts#18's
// key<->value correlation, scaled up to a whole API.

export class EventEmitter<EventMap extends Record<string, unknown>> {
  // one listener set per event name; payload types enforced per name
  private listeners = new Map<keyof EventMap, Set<(payload: never) => void>>();

  on<K extends keyof EventMap>(
    event: K,
    listener: (payload: EventMap[K]) => void,
  ): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event)!;
    set.add(listener as (payload: never) => void);
    return () => set.delete(listener as (payload: never) => void);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      (listener as (payload: EventMap[K]) => void)(payload);
    }
  }
}
// (The two internal casts are the honest cost: the Map stores
// listeners for DIFFERENT events together, and TS can't track which
// set holds which. The casts are PRIVATE — sealed inside a class
// whose PUBLIC signatures are fully checked. Contained unsafety
// with a checked boundary — ts#13's architecture, applied inward.)

// ==== usage: define the event map, get a checked contract =========
// (a TYPE alias, deliberately: it satisfies the Record constraint
// structurally. An `interface ... extends Record<string, unknown>`
// would inherit a string INDEX SIGNATURE — making typo'd event
// names legal again. Subtle, and exactly the kind of thing the
// type tests below exist to catch.)
type DownloadEvents = {
  progress: number;
  done: { name: string; size: number };
  error: { message: string };
};

export const emitter = new EventEmitter<DownloadEvents>();

emitter.on('progress', (percent) => {
  // percent: number — inferred from the map, no annotation
  console.log(`${percent}%`);
});

emitter.on('done', (file) => {
  console.log(`${file.name} (${file.size} bytes)`); // file: {name, size}
});

emitter.emit('progress', 50);
emitter.emit('done', { name: 'a.zip', size: 1024 });

// ==== type tests: every original violation, now rejected ==========
// @ts-expect-error — 'fifty' is not a number (progress payload)
emitter.emit('progress', 'fifty');

// @ts-expect-error — done's payload requires size
emitter.emit('done', { name: 'a.zip' });

// @ts-expect-error — 'progess' is not an event (THE silent bug, now loud)
emitter.emit('progess', 50);

// @ts-expect-error — done cannot be emitted without its payload
emitter.emit('done');

// @ts-expect-error — listeners are checked too: wrong param type rejected
emitter.on('progress', (percent: string) => console.log(percent));
