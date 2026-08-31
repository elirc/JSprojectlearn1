/**
 * The feed's ENTIRE rulebook, as one pure function plus one pure guard:
 *
 *   nextState = feedReducer(state, action)
 *   allowed   = canLoadMore(state)
 *
 * No React and no DOM in this file — which is exactly the point. There is
 * no IntersectionObserver here, no scrollTop, no fetch; "should we start
 * another page?" turns out to be a question about *state*, not about
 * pixels. Because it's pure, feed.test.js pins down every rule in Node
 * without scrolling anything.
 *
 * The bug this file exists to kill: the original fires its scroll handler
 * dozens of times per flick, and each fire starts a page load, because
 * nothing anywhere knows a load is already running. Here that knowledge is
 * a *state value* — status === 'loading' — and "one at a time" is a rule
 * the reducer enforces, not a boolean someone has to remember to check.
 *
 * state:  { items: [{id, title, body}], page, status, error, hasMore }
 * status: 'idle' | 'loading' | 'error' | 'done'   <- one discriminated
 *         status, not three booleans (project 20). Three booleans can
 *         spell nonsense like loading && done; this can't.
 * action: { type: 'loadStarted' | 'pageLoaded' | 'loadFailed'
 *                | 'retried' | 'reset', ... }
 */
export const initialFeedState = {
  items: [],
  page: 0, // pages successfully loaded so far; next page to fetch is page + 1
  status: 'idle',
  error: null,
  hasMore: true,
};

export function feedReducer(state, action) {
  switch (action.type) {
    case 'loadStarted': {
      // THE GUARD, as a rule. Asking to load while a load is in flight —
      // or after the feed ran out, or while an error is on screen — is a
      // no-op, and a no-op returns the SAME reference so React re-renders
      // nothing (project 10's reference model, used deliberately).
      if (!canLoadMore(state)) return state;
      return { ...state, status: 'loading', error: null };
    }

    case 'pageLoaded': {
      // Only a load that is actually running can finish. A late reply from
      // a request we already gave up on (reset, error) is dropped — the
      // fetch-race lesson of project 19, spelled as a rule.
      if (state.status !== 'loading') return state;
      const hasMore = action.hasMore !== false;
      return {
        items: [...state.items, ...action.items],
        page: state.page + 1,
        status: hasMore ? 'idle' : 'done',
        error: null,
        hasMore,
      };
    }

    case 'loadFailed': {
      if (state.status !== 'loading') return state;
      return { ...state, status: 'error', error: action.error };
    }

    case 'retried': {
      // Only an error is recoverable. Retrying an idle feed would be a
      // second way to say 'loadStarted', and two ways to say one thing is
      // how state machines rot.
      if (state.status !== 'error') return state;
      return { ...state, status: 'idle', error: null };
    }

    case 'reset':
      return initialFeedState;

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * The one question the UI asks before starting anything: may I?
 *
 * Pure, so the answer is testable without a browser; shared, so the
 * observer callback, a "load more" button and a keyboard shortcut all
 * obey the same rule instead of each inventing their own.
 */
export function canLoadMore(state) {
  if (state.status === 'loading') return false; // one at a time
  if (state.status === 'error') return false; // until 'retried'
  if (state.status === 'done') return false; // ran out, permanently
  return state.hasMore;
}
