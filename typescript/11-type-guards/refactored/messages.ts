// User-defined type guards: functions whose return type is
// `value is T`. The runtime check and the type knowledge become the
// SAME artifact — written once, reused everywhere, impossible to
// drift apart (they're one function).

export interface ChatMessage {
  kind: 'chat';
  user: string;
  text: string;
}

export interface JoinMessage {
  kind: 'join';
  user: string;
}

export interface PingMessage {
  kind: 'ping';
}

export type Message = ChatMessage | JoinMessage | PingMessage;

// small reusable base guard:
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// THE guard: actually verifies each variant's fields. The `value is
// Message` return type is the contract: "if I return true, the
// compiler may treat it as Message" — so the body carries real
// responsibility (a guard that lies is a cast with extra steps).
export function isMessage(value: unknown): value is Message {
  if (!isRecord(value)) return false;

  switch (value.kind) {
    case 'chat':
      return typeof value.user === 'string' && typeof value.text === 'string';
    case 'join':
      return typeof value.user === 'string';
    case 'ping':
      return true;
    default:
      return false;
  }
}

export function handleMessage(raw: unknown): string {
  if (!isMessage(raw)) {
    return `dropped malformed message`; // js#36: rejects are counted, not hidden
  }

  // raw: Message from here — and the discriminant does the rest (project 10):
  switch (raw.kind) {
    case 'chat':
      return `${raw.user}: ${raw.text}`;
    case 'join':
      return `${raw.user} joined`;
    case 'ping':
      return 'pong';
  }
}

export const results = [
  handleMessage({ kind: 'chat', user: 'ada', text: 'hi' }), // "ada: hi"
  handleMessage({ kind: 'chat', user: 'ada' }),             // dropped (missing text)
  handleMessage({ kind: 'chat', user: 42, text: null }),    // dropped (wrong types)
  handleMessage('not even an object'),                      // dropped
];

// ==== type tests ==================================================
declare const unknownValue: unknown;

// @ts-expect-error — unknown stays locked without the guard
export const locked: string = unknownValue.kind;

const checked: unknown = { kind: 'ping' };
export let observedKind: Message['kind'] | null = null;
if (isMessage(checked)) {
  // inside the guard, it's a Message — this access typechecks:
  observedKind = checked.kind;
}
