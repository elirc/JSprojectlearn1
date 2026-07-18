// A media player's state, modeled as The Big Bag Of Fields. Every
// field is individually reasonable; the COMBINATIONS are where the
// lies live. (ts#10 showed this for requests; here's the disease at
// app-state scale, plus its cousin: fields that only apply sometimes.)

export interface PlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentTrack: string | null;   // null when stopped... supposedly
  positionSeconds: number;        // meaningless when stopped... but present
  bufferPercent: number;          // only means anything while buffering
  error: string | null;           // and errors, orthogonal to everything?
}

export function describePlayer(state: PlayerState): string {
  if (state.isPlaying) {
    return `▶ ${state.currentTrack} @ ${state.positionSeconds}s`;
    // currentTrack: string | null — so this can render "▶ null @ 42s".
    // The null-ness SHOULD be tied to the stopped-ness. It isn't.
  }
  if (state.isPaused) return `⏸ ${state.currentTrack}`;
  if (state.isBuffering) return `⏳ ${state.bufferPercent}%`;
  return '⏹ stopped';
}

// The states that shouldn't exist, existing:
export const impossible1: PlayerState = {
  isPlaying: true,
  isPaused: true,      // playing AND paused
  isBuffering: false,
  currentTrack: 'song.mp3',
  positionSeconds: 42,
  bufferPercent: 0,
  error: null,
};

export const impossible2: PlayerState = {
  isPlaying: true,
  isPaused: false,
  isBuffering: false,
  currentTrack: null,  // playing... nothing
  positionSeconds: 42,
  bufferPercent: 0,
  error: null,
};

// 2^3 booleans x nullable track x always-present position = a state
// space mostly made of nonsense, patrolled by runtime checks that
// each handler writes (or forgets) separately.
