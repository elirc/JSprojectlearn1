# 📘 Learning Guide: Callback Types

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

The code fetches a user (pretend network call) and reports back through **callbacks** — functions you hand in, to be called later with the result: one for success, one for error.

The type-level problem: the callbacks are typed so loosely (`any`, `Function`, optional) that the real contract — *when* is each called, *with what data*, *how many times* — lives only in a code comment. And the comment is already wrong. The exercise shows two fixes: first, give the callbacks real, named types; then the stronger move — replace the two callbacks with **one** callback that receives a **discriminated union** result, so "you get exactly one outcome" is stated by the type itself.

## 2. Concepts you need first

### Callbacks and asynchronous code
A callback is a function passed as an argument, to be called later:

```ts
function afterDelay(ms: number, callback: () => void) {
  setTimeout(callback, ms); // setTimeout runs callback after ms milliseconds
}
afterDelay(1000, () => console.log('one second passed'));
```

`setTimeout` makes code **asynchronous**: the function returns immediately, and the callback fires later. That's why fetch-style helpers can't just `return` the user — the answer isn't ready yet.

### Function types, and why `Function` (capital F) is bad
A precise function type spells out parameters and return: `(user: User) => void`. The built-in type `Function` just means "some function, who knows what it takes":

```ts
const f: Function = (x: number) => x + 1;
f('hello', true, {}); // ✅ compiles! Function checks nothing
```

`Function` is nearly as bad as `any` for functions. (Exercise 15's LEARN.md covers function types fully.)

### Optional parameters (`?`)
`onError?: ...` means callers may omit it. Sensible for a *nice-to-have*; dangerous for an *error handler*, because it makes ignoring errors the path of least resistance.

### Type aliases for functions
You can name a function type and reuse it:

```ts
type ClickHandler = (x: number, y: number) => void;
const h: ClickHandler = (x, y) => console.log(x, y); // params inferred
```

Naming turns "what does this callback get?" from archaeology into documentation the compiler enforces.

### Discriminated unions (the core tool here)
A union type is "this OR that." A *discriminated* union gives every branch a shared literal field (the **discriminant**, here `status`) so the compiler can tell branches apart:

```ts
type Result =
  | { status: 'success'; value: number }
  | { status: 'error'; message: string };

function handle(r: Result) {
  if (r.status === 'error') {
    console.log(r.message);  // ✅ narrowed: only the error branch has message
  } else {
    console.log(r.value);    // ✅ here it can only be the success branch
  }
  // console.log(r.value);   // ❌ Error: value doesn't exist on the error branch
}
```

The `if` check is called **narrowing** — the compiler shrinks the union to one branch inside each block. Exercise 10's LEARN.md teaches this from scratch.

### `@ts-expect-error`
A comment asserting the next line must FAIL to compile — a "type test." Explained in exercise 19's LEARN.md.

## 3. Walking through the original code

```ts
// "calls onSuccess with the user, or onError with the message"
export function fetchUser(
  id: number,
  onSuccess: (user: any) => any,   // any-in, any-out
  onError?: Function,              // optional, and typed as mush
): void {
```

The contract is that comment in quotes. The types say almost nothing: `onSuccess` gets `any` (so nothing inside it is checked), `onError` is an optional `Function` (any arguments, maybe not even provided).

```ts
if (id <= 0) {
  if (onError) onError({ code: 400 }); // ...passes an object
  return;
}
```

First lie exposed: the comment promised `onError` a *message string*. The code passes `{ code: 400 }` — an object. Because `onError` is `Function`, the compiler can't compare promise vs. reality.

```ts
setTimeout(() => {
  onSuccess({ id, name: `user${id}` });
  onSuccess({ id, name: `user${id}` });
  // ^ called TWICE (a paste bug).
}, 10);
```

The success callback fires twice — someone pasted the line twice. No type ever promises "called once," but with `any` everywhere, *no* signature promised *anything*, so the reviewer had nothing to check the code against.

Then the caller:

```ts
fetchUser(
  7,
  (user) => console.log(user.nmae.toUpperCase()),
  (message: string) => console.log(`error: ${message.toUpperCase()}`),
);
```

Two bugs in one call. `user.nmae` is a typo (`name`), invisible because `user` is `any` — it crashes at runtime, and thanks to the double-fire, it crashes *twice*. And the error callback believed the comment: it expects a `string`, but would receive `{ code: 400 }`, so `message.toUpperCase()` would crash — *while handling an error*. The error handler is itself broken, and the compiler never noticed because `Function` accepts any shape of callback.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the contract lives in a comment, and comments can lie.** The comment says "onError gets the message." The code sends an object. Nobody enforces comments. Types ARE enforced — that's the whole trade.

**Runtime bug story:** A user submits a bad form, `id` is `-1`, your error handler runs to show a friendly message... and crashes on `message.toUpperCase()`, because `message` is actually `{ code: 400 }`. The user sees a frozen page. The one code path meant to handle failure is the one that fails.

**Flaw 2: `onError` is optional.** Most callers skip optional things. So the *default* behavior of this API is "errors vanish." An unhandled error should be a visible, deliberate choice, not something you get by doing nothing.

**Flaw 3: two separate callbacks can't express "exactly one happens."** With `onSuccess` and `onError` as independent parameters, the type system can't rule out: both called, neither called, or one called twice (the paste bug!). The relationship between them is unstatable.

**Flaw 4: `any` hid the typo.** `user.nmae` compiles, returns `undefined`, and `.toUpperCase()` crashes at runtime — twice, thanks to the double fire.

## 5. Try it yourself first!

1. **Vague hint:** Move the comment's claims into the type signatures. Every claim the comment makes should become something the compiler checks.
2. **Less vague:** Create named types for both callbacks (`type SuccessHandler = ...`, `type ErrorHandler = ...`). Decide honestly: what does the error handler *really* receive? Make `onError` required.
3. **More specific:** `type SuccessHandler = (user: User) => void` and `type ErrorHandler = (error: { code: number; message: string }) => void`. With these in place, the caller's typo and the wrong error expectation both become compile errors.
4. **The stronger redesign:** replace both callbacks with ONE: `done: (result: FetchResult) => void`, where `FetchResult` is a discriminated union — a success branch carrying the user, an error branch carrying code and message.
5. **Check the payoff:** inside the caller, `result.user` should NOT compile until you've checked `result.status === 'success'`. If it compiles unnarrowed, your union isn't discriminated.

## 6. Understanding the refactored solution

The file shows a deliberate two-step progression.

**Step 1 — name the callback types:**

```ts
export type SuccessHandler = (user: User) => void;
export type ErrorHandler = (error: { code: number; message: string }) => void;

export function fetchUserCallbacks(
  id: number,
  onSuccess: SuccessHandler,
  onError: ErrorHandler, // required
): void {
```

Three fixes at once: the error payload's true shape is in the signature (comment retired), `user.nmae` inside a `SuccessHandler` is a compile error, and `onError` is *required* — a caller who doesn't care must at least write one and say so visibly.

**Step 2 — the stronger shape: one callback, one result union:**

```ts
export type FetchResult =
  | { status: 'success'; user: User }
  | { status: 'error'; code: number; message: string };

export function fetchUser(id: number, done: (result: FetchResult) => void): void {
```

Why is this better than the fixed two-callback version? Because the *type itself* now says: "you will be handed exactly one outcome, and it is one of these two." Two separate callbacks could never state that relationship. The caller narrows once:

```ts
fetchUser(7, (result) => {
  if (result.status === 'error') {
    console.log(`error ${result.code}: ${result.message}`);
    return;
  }
  console.log(result.user.name.toUpperCase()); // narrowed: user is present
});
```

The compiler forces the caller to face both branches — `result.user` before the check simply doesn't exist (one of the type tests proves it).

**The footnote about Promises:** a Promise is JavaScript's built-in "one future result" object, and a promise can only settle (resolve or reject) *once* — which kills the double-fire bug *structurally*, not by discipline. Once the API is shaped as "one callback, one result object," converting it to return a Promise is mechanical. The result-object step is what makes that migration safe.

The three type tests pin down the original's bugs: the `nmae` typo, an `ErrorHandler` that expects a bare string, and unnarrowed access to `result.user`.

## 7. Words you learned (glossary)

- **Callback**: a function passed in now, called later with a result.
- **Asynchronous**: work that finishes later; the function returns before the answer exists.
- **`setTimeout`**: built-in that runs a function after a delay (simulates a network call here).
- **Contract**: what a function promises — when callbacks fire, with what data, how often.
- **`Function` type**: "some function, unchecked" — avoid it; write real signatures.
- **Optional parameter (`?`)**: an argument callers may omit.
- **Type alias**: a name for a type (`type X = ...`), reusable and self-documenting.
- **Union type**: a value that is one of several listed shapes.
- **Discriminant**: the shared literal field (like `status`) that tells branches apart.
- **Discriminated union**: a union whose branches carry a discriminant, enabling narrowing.
- **Narrowing**: the compiler shrinking a union to one branch after a check.
- **Double-fire**: a callback wrongly invoked twice — invisible unless something enforces "once."
- **Promise**: a built-in object representing one future result; settles exactly once.
- **Promisify**: converting a callback-based API to a Promise-returning one.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change; undo afterward.

1. In `refactored/fetching.ts`, remove the `if (result.status === 'error')` check in the demo caller and access `result.user.name` directly. Expect: ❌ error — `user` doesn't exist until the union is narrowed.
2. Add a third branch to `FetchResult`: `| { status: 'timeout'; afterMs: number }`. Expect: everything still compiles (an `if/return` pattern doesn't force exhaustiveness). Now think: how would a `switch` on `result.status` plus exercise 12's exhaustiveness trick make forgetting `'timeout'` a compile error?
3. Change `ErrorHandler`'s parameter to `string` to "believe the comment" again. Expect: ❌ error inside `fetchUserCallbacks` — the body passes an object. The lie now has a squiggle at its source.
4. In the success branch of `fetchUser`, paste the `done({ status: 'success', ... })` line twice — recreating the original's paste bug. Expect: ✅ it compiles. Types don't count calls! Only the Promise design fixes this structurally. Worth feeling where the type system's limits are.
5. Write `done({ status: 'succes', user: { id: 1, name: 'a' } })` (typo'd status) inside `fetchUser`. Expect: ❌ error — `'succes'` is not a member of the union. Compare with the original, where any string would have sailed through.
