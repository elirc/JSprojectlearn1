// Callback contracts as NAMED TYPES — and then the stronger move:
// replacing the two-callback shape with one callback taking a
// discriminated result (ts#10), so "success XOR error" is in the
// TYPE, not the prose.

export interface User { id: number; name: string }

// Step 1: name the callback types (ts#15). Contracts become code:
export type SuccessHandler = (user: User) => void;
export type ErrorHandler = (error: { code: number; message: string }) => void;

export function fetchUserCallbacks(
  id: number,
  onSuccess: SuccessHandler,
  onError: ErrorHandler, // required: an unhandled error is a choice,
): void {                //           not a default (js#30)
  if (id <= 0) {
    onError({ code: 400, message: 'id must be positive' });
    return;
  }
  setTimeout(() => {
    onSuccess({ id, name: `user${id}` });
  }, 10);
}

// Step 2 — the better shape: ONE callback, taking a discriminated
// union. Now the type itself says "you get exactly one of these":
export type FetchResult =
  | { status: 'success'; user: User }
  | { status: 'error'; code: number; message: string };

export function fetchUser(id: number, done: (result: FetchResult) => void): void {
  if (id <= 0) {
    done({ status: 'error', code: 400, message: 'id must be positive' });
    return;
  }
  setTimeout(() => {
    done({ status: 'success', user: { id, name: `user${id}` } });
  }, 10);
}

fetchUser(7, (result) => {
  // one narrow, both cases handled — the compiler won't let a
  // caller forget the error arm the original made optional:
  if (result.status === 'error') {
    console.log(`error ${result.code}: ${result.message}`);
    return;
  }
  console.log(result.user.name.toUpperCase()); // user: present, typed
});

// (Once shaped like this, promisifying is mechanical — and Promises
// also solve the double-fire: a promise settles ONCE, structurally.
// js#43 territory; the callback->result-object step is what makes
// the migration safe.)

// ==== type tests ==================================================
// @ts-expect-error — the typo the double-fire crashed on: 'nmae' not on User
fetchUser(7, (result) => result.status === 'success' && result.user.nmae);

// @ts-expect-error — error handlers receive the object, not a bare string
export const wrong: ErrorHandler = (message: string) => console.log(message);

fetchUser(7, (result) => {
  // @ts-expect-error — user doesn't exist until narrowed to success (ts#10)
  console.log(result.user);
});
