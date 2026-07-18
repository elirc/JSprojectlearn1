// Messages arrive from a websocket as parsed JSON. Three shapes are
// possible. The dispatcher "checks" them... with casts after a
// glance at one field.

interface ChatMessage {
  kind: 'chat';
  user: string;
  text: string;
}

interface JoinMessage {
  kind: 'join';
  user: string;
}

interface PingMessage {
  kind: 'ping';
}

export function handleMessage(raw: unknown): string {
  // The right instinct (check!), the wrong tool (cast):
  const msg = raw as ChatMessage | JoinMessage | PingMessage;
  // ^ one cast and `unknown` is defeated. Nothing verified that raw
  //   has a `kind` at all, let alone the right fields.

  switch (msg.kind) {
    case 'chat':
      return `${msg.user}: ${msg.text}`;
    case 'join':
      return `${msg.user} joined`;
    case 'ping':
      return 'pong';
    default:
      return '?';
  }
}

// The lie in action — all of these COMPILE and produce garbage or
// crashes at runtime:
export const a = handleMessage({ kind: 'chat', user: 'ada' });
// text is missing -> "ada: undefined"

export const b = handleMessage({ kind: 'chat', user: 42, text: null });
// wrong types entirely -> "42: null"

export const c = handleMessage('not even an object');
// msg.kind on a string -> undefined -> '?' ... silently

// The duplicated-check version is no better: every call site that
// wants to know "is this a chat message?" re-writes
//   typeof x === 'object' && x !== null && (x as any).kind === 'chat'
// slightly differently, with drift (js#04) in each copy.
