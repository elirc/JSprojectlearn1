// react#20's fetch-state trio, typed the way it was written there:
// one bag of optionals. The compiler is present and unable to help.

export interface RequestState {
  isLoading: boolean;
  data?: string;
  error?: string;
}

export function renderRequest(state: RequestState): string {
  if (state.isLoading) return 'loading…';
  if (state.error) return `error: ${state.error}`;
  if (state.data) return `data: ${state.data}`;
  return 'idle';
}

// The type HAPPILY represents every nonsense react#20 demonstrated:
export const nonsense1: RequestState = {
  isLoading: true,
  data: 'stale results',
  error: 'also an error??',
}; // loading AND data AND error — compiles.

export const nonsense2: RequestState = {
  isLoading: false,
}; // finished with neither data nor error — compiles.

// And because data/error are optional EVERYWHERE, every access needs
// a fallback even in branches where they logically must exist:
export function summarize(state: RequestState): string {
  if (!state.isLoading && !state.error) {
    // we "know" this is the success case... the type doesn't:
    return state.data ?? '(data missing in success state??)';
  }
  return 'not ready';
}

// The type models FIELDS, not STATES. Four real states, expressible
// as 2 x present/absent x present/absent = 8 field combos, 4 of
// which are lies the compiler can't reject.
