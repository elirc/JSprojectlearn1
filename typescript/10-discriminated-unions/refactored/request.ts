// THE lesson of the track: a discriminated union. One `status`
// field (the discriminant) tags which state you're in, and each
// state carries EXACTLY its own fields. js#40's "impossible states
// are unrepresentable" — now with the compiler as the bouncer.

export type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

export function renderRequest(state: RequestState): string {
  // narrowing on the discriminant: inside each case, the OTHER
  // fields exist — no optionals, no fallbacks, no ?? — because
  // each variant carries exactly what it has:
  switch (state.status) {
    case 'idle':
      return 'idle';
    case 'loading':
      return 'loading…';
    case 'success':
      return `data: ${state.data}`;   // data: string. present. certain.
    case 'error':
      return `error: ${state.error}`; // error: string. same.
  }
}

export function summarize(state: RequestState): string {
  if (state.status === 'success') {
    return state.data; // no ?? '(data missing??)' — the type PROVES it's there
  }
  return 'not ready';
}

// Transitions produce whole new states (react#20's wholesale
// replacement, typed):
export function toSuccess(data: string): RequestState {
  return { status: 'success', data };
}

// ==== type tests: react#20's nonsense, now unrepresentable ========
// @ts-expect-error — loading cannot carry data (stale-result bug, banned)
export const nonsense1: RequestState = { status: 'loading', data: 'stale' };

// @ts-expect-error — success without data is not success
export const nonsense2: RequestState = { status: 'success' };

// @ts-expect-error — error cannot carry data alongside
export const nonsense3: RequestState = { status: 'error', error: 'x', data: 'y' };

declare const state: RequestState;
// @ts-expect-error — data doesn't exist until you've narrowed to success
export const grab: string = state.data;
