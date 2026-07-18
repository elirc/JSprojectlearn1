/**
 * The WebSocket opening handshake: an HTTP request that upgrades.
 *
 * The browser sends a random Sec-WebSocket-Key; the server must
 * answer with SHA-1(key + A-MAGIC-GUID), base64'd. The GUID is fixed
 * by RFC 6455 — the ritual proves the server actually speaks
 * WebSocket (an unwitting HTTP server would never produce the right
 * accept value, so the browser refuses to proceed).
 */
import crypto from 'node:crypto';

const MAGIC_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export function acceptKey(secWebSocketKey) {
  return crypto
    .createHash('sha1')
    .update(secWebSocketKey + MAGIC_GUID)
    .digest('base64');
}

export function upgradeResponse(secWebSocketKey) {
  return [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey(secWebSocketKey)}`,
    '', '',
  ].join('\r\n');
}
