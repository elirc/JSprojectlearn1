# 🏋️ Practice: Conditional Rendering

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (All of these are checkable by reading and reasoning; running the page just needs internet once, since React loads from a CDN.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. One message, many messages (warm-up)

`UnreadBadge` currently says "3 unread" — but with exactly one message it would say "1 unread", which reads oddly next to `MessageList`'s "One message" sentence. Make the badge say "1 unread message" for one, and "N unread messages" for more. Also add a "load 1" button so you can actually reach that state.

**Practices:** stacking guard clauses — each `if ... return` handles one case and exits.

**Hint:** the `count === 0` guard already exists; a `count === 1` guard slots in right below it.

**Expected:** "load 1" shows "One message: msg 1" and "1 unread message"; "load 3" shows the list and "3 unread messages"; "load 0" shows "No messages." and no badge.

### ⭐⭐ 2. Predict which guard wins (core)

Without running anything, predict exactly what this renders. Assume `MessageList` and `UnreadBadge` are defined exactly as in `refactored/index.html`.

```jsx
function Preview() {
  return (
    <div>
      <MessageList
        isLoading={true}
        error="server exploded"
        messages={['msg 1', 'msg 2']}
      />
      <UnreadBadge count={0} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Preview />);
```

All three props are "interesting" at once: loading is true, an error is set, AND messages exist. What appears on screen, and what happened to the other two branches?

**Practices:** reading a guard ladder — reading order is priority order.

**Hint:** a `return` statement doesn't negotiate; the first guard that fires ends the function.

**Expected:** your written prediction names exactly what's on screen (it's short) and explains why the red text and the list never appear.

### ⭐⭐ 3. Fix the backwards badge (core)

A teammate refactored `UnreadBadge` and now it behaves exactly upside-down: with 3 messages loaded there's no badge, and after "load 0" the page shows "0 unread". Their code:

```jsx
function UnreadBadge({ count }) {
  if (count) return null;
  return <p>{count} unread</p>;
}
```

Explain both wrong behaviors from the code, then fix the guard.

**Practices:** truthiness in guards — why `if (count)` is not the same test as `if (count === 0)`.

**Hint:** say `if (count)` out loud with `count` being `3`, then being `0`. Which branch runs each time?

**Expected:** after the fix, "load 3" shows the badge with 3, and "load 0" shows no badge at all.

### ⭐⭐ 4. A Retry button in the error state (core)

When the load fails, the user's only option is to find the original buttons again. Put a "Retry" button *inside* the error message that reloads three messages. `MessageList` doesn't own `load`, so it will need the handler passed in as a prop — name it `onRetry`.

**Practices:** passing a function as a prop so a child can trigger the parent's logic, inside one guard branch.

**Hint:** add `onRetry` to `MessageList`'s props and render the button only in the `if (error)` branch; `App` passes `onRetry={() => load(3)}`.

**Expected:** "load (fails)" shows red "server exploded" with a Retry button beside it; clicking Retry shows "Loading..." and then the three messages (and the badge).

### ⭐⭐⭐ 5. Show only the first three (challenge)

Long inboxes shouldn't dump everything. Add a rule to `MessageList`: with **more than three** messages, show only the first three as bullets, followed by a line like "...and 3 more". Add a "load 6" button to prove it. Think carefully about *where* in the guard ladder the new rule belongs.

**Practices:** inserting a new guard at the right priority, plus `slice` for a non-mutating "first N".

**Hint:** `messages.slice(0, 3)` is the first three; the guard must run before the final "show everything" return.

**Expected:** "load 6" shows bullets for msg 1, msg 2, msg 3 and the line "...and 3 more"; "load 3" still shows all three bullets and no "more" line.

## Solutions

### 1. One message, many messages

```jsx
function UnreadBadge({ count }) {
  if (count === 0) return null;
  if (count === 1) return <p>1 unread message</p>;
  return <p>{count} unread messages</p>;
}
```

And next to the other buttons in `App`:

```jsx
<button onClick={() => load(1)}>load 1</button>
```

**Why:** guard clauses stack naturally — zero exits first, one exits next, and the final return handles "everything else" with no nesting. Doing this with ternaries inside JSX would already be a two-level tower; in a function body it's three readable lines. The new button reuses the existing `load(count, fail)` helper, so the one-message state is one click away.

### 2. Predict which guard wins

The screen shows exactly one thing: **"Loading..."**. Nothing else — no red error text, no message list, no badge.

**Why:** `MessageList`'s first line is `if (isLoading) return <p>Loading...</p>;` — and `isLoading` is `true`, so the function returns immediately. The `error` string and the two messages are never even looked at: reading order is priority order, and loading outranks everything below it. `UnreadBadge` receives `count={0}`, hits `if (count === 0) return null;`, and contributes nothing to the page. (Whether "loading wins over error" is *right* is a design question — the point is the guard ladder makes the answer visible instead of buried in a ternary tower.)

### 3. Fix the backwards badge

```jsx
function UnreadBadge({ count }) {
  if (count === 0) return null;
  return <p>{count} unread</p>;
}
```

**Why:** the buggy guard `if (count)` asks "is count truthy?" — with 3 messages that's true, so the component returned `null` and the badge vanished exactly when there was something to report. With 0, the guard is false (0 is falsy), so it fell through and rendered "0 unread". The intended test is the specific comparison `count === 0`: hide only when there is nothing to show. Guards deserve real comparisons, not vibes — the same discipline that keeps a bare `0` off the page in `&&` expressions.

### 4. A Retry button in the error state

```jsx
function MessageList({ isLoading, error, messages, onRetry }) {
  if (isLoading) return <p>Loading...</p>;
  if (error) {
    return (
      <p style={{ color: 'red' }}>
        {error} <button onClick={onRetry}>Retry</button>
      </p>
    );
  }
  if (messages.length === 0) return <p>No messages.</p>;
  if (messages.length === 1) return <p>One message: {messages[0]}</p>;
  return <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>;
}
```

And in `App`:

```jsx
<MessageList
  isLoading={isLoading}
  error={error}
  messages={messages}
  onRetry={() => load(3)}
/>
```

**Why:** `MessageList` can't reach `App`'s `load` function, so `App` hands it down as a prop — functions are values in JavaScript, and props carry values. The button lives inside the `if (error)` branch, so it can only ever appear in the error state; no extra condition needed anywhere else. Clicking it runs `load(3)`, which sets `isLoading` true and clears the error, so the first guard takes over and "Loading..." replaces the error message immediately.

### 5. Show only the first three

```jsx
function MessageList({ isLoading, error, messages }) {
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (messages.length === 0) return <p>No messages.</p>;
  if (messages.length === 1) return <p>One message: {messages[0]}</p>;
  if (messages.length > 3) {
    return (
      <div>
        <ul>{messages.slice(0, 3).map((m) => <li key={m}>{m}</li>)}</ul>
        <p>...and {messages.length - 3} more</p>
      </div>
    );
  }
  return <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>;
}
```

And next to the other buttons in `App`:

```jsx
<button onClick={() => load(6)}>load 6</button>
```

**Why:** the new guard must sit *above* the final return (or that "show everything" line would win for six messages) but below the zero/one guards, which handle their cases first anyway. With "load 6", `slice(0, 3)` yields msg 1 through msg 3 without touching the original array, and `messages.length - 3` is 3, so the tail line reads "...and 3 more"; with exactly three messages `3 > 3` is false and the normal list renders. Compare adding this rule to the original's ternary tower: here it's one self-contained block dropped into a visible priority order.
