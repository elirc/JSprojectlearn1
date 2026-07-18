// The player as a discriminated union (ts#10) — with the extra move
// that makes it APP-state modeling: fields live ONLY on the variants
// where they mean something. positionSeconds doesn't exist on
// 'stopped'; there is nothing to be meaningless.

export type PlayerState =
  | { status: 'stopped' }
  | { status: 'playing'; track: string; positionSeconds: number }
  | { status: 'paused'; track: string; positionSeconds: number }
  | { status: 'buffering'; track: string; bufferPercent: number }
  | { status: 'error'; message: string };

export function describePlayer(state: PlayerState): string {
  switch (state.status) {
    case 'stopped':
      return '⏹ stopped';
    case 'playing':
      return `▶ ${state.track} @ ${state.positionSeconds}s`;
      // track: string — not string|null. "▶ null" is inexpressible,
      // because a playing state without a track can't be built.
    case 'paused':
      return `⏸ ${state.track} @ ${state.positionSeconds}s`;
    case 'buffering':
      return `⏳ ${state.track} (${state.bufferPercent}%)`;
    case 'error':
      return `⚠ ${state.message}`;
  }
}

// Transitions read like the js#40 machine (states in, states out):
export function play(state: PlayerState, track: string): PlayerState {
  void state; // from anywhere: start the track fresh
  return { status: 'playing', track, positionSeconds: 0 };
}

export function pause(state: PlayerState): PlayerState {
  if (state.status !== 'playing') return state; // only playing can pause
  return { status: 'paused', track: state.track, positionSeconds: state.positionSeconds };
}

export const demo = [
  describePlayer({ status: 'stopped' }),
  describePlayer({ status: 'playing', track: 'song.mp3', positionSeconds: 42 }),
  describePlayer({ status: 'buffering', track: 'song.mp3', bufferPercent: 80 }),
];

// ==== type tests: the original's nonsense, now unrepresentable ====
// @ts-expect-error — playing-AND-paused: one status field, one status
export const impossible1: PlayerState = { status: 'playing', isPaused: true, track: 'x', positionSeconds: 0 };

// @ts-expect-error — playing NOTHING: 'playing' requires a track
export const impossible2: PlayerState = { status: 'playing', positionSeconds: 42 };

// @ts-expect-error — bufferPercent doesn't exist while playing
export const impossible3: PlayerState = { status: 'playing', track: 'x', positionSeconds: 0, bufferPercent: 50 };

declare const state: PlayerState;
// @ts-expect-error — position isn't readable until narrowed to a variant that has it
export const pos: number = state.positionSeconds;
