# 🏋️ Practice: Context Splitting

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. These build on each other: 2 finds a real subtlety in the demo, 3 and 4 are two different repairs, 5 extends the repaired version.

(Once for this file: everything is writable and predictable offline; running the page needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Subscription is by consumption (warm-up)

Two true/false claims to settle with one sentence each:
(a) In the *original*, `const { theme } = useContext(AppContext)` re-renders only when `theme` changes, because the destructuring picks one field.
(b) In the *refactor*, if `UserPanel` gained the line `const n = useContext(NotificationContext);` but never used `n` anywhere, its render behavior would be unaffected.

*Practices:* what exactly creates a context subscription.
*Hint:* the subscription is made by the `useContext` call itself.
*Expected:* both are false, for the reasons in the solution.

### ⭐⭐ 2. Predict what *really* renders (core)

The refactor's caption promises "the bell ticks alone." Audit that promise with the rules you already own: `notifications` state lives in `App`; the interval fires every second; `ThemePanel`, `UserPanel`, and `NotificationBell` are rendered directly in `App`'s JSX. Walk one tick through the system and predict what each of the three counters actually does, as shipped.

*Practices:* remembering that context is not the only wake-up source — parent re-renders never stopped existing.
*Hint:* project 29: a state change re-renders its owner *and everything below it*.
*Expected:* your trace matches the solution. (Exercises 3 and 4 then deliver the caption's promise two different ways.)

### ⭐⭐ 3. Repair #1 — the memo shortcut (core)

Wrap all three panels in `React.memo` (they take no props). Predict, then verify: what does each counter do (a) on a notification tick, (b) on a theme toggle? Explain the special rule that lets the bell keep waking even though it's memoized with unchanged (zero) props.

*Practices:* context updates pierce `memo` — memo blocks parent-driven re-renders, never subscription-driven ones.
*Hint:* two separate wake-up channels; `memo` guards exactly one of them.
*Expected:* tick → only the bell's counter moves; toggle → only the theme panel's. If the theme value weren't memoized in `App`, the theme panel would tick too.

### ⭐⭐⭐ 4. Repair #2 — providers that own their state (challenge)

Remove the memos and fix it structurally instead: extract `ThemeProvider({ children })` and `NotificationProvider({ children })` components that *own* their state (theme; notifications + the interval), make the toggle a small `ThemeToggleButton` component consuming the theme context, and leave `App` completely stateless. Explain why a provider's own re-render does *not* re-render its `{children}`.

*Practices:* the children-identity bailout — the structural reason the Provider+children shape is the standard one.
*Hint:* `children` is a prop; if the elements inside it are the *same objects* as last render, React skips re-rendering them — while context propagation still reaches consumers below.
*Expected:* tick → bell counter only; toggle → theme panel counter only (plus the button itself); user panel stays at 1 forever. No `memo` anywhere.

### ⭐⭐⭐ 5. Mark-all-read via an actions context (challenge)

Building on exercise 4: add a `MarkReadButton` (with its own render counter) that resets the count to 0. Requirement: the button must consume *something* from the notification module — but its counter must stay at 1 forever, even as the bell ticks. Split the notification context into a value context and an **actions** context.

*Practices:* the value/actions split — readers subscribe to data, writers subscribe to (stable) functions.
*Hint:* the actions object must be referentially stable: `useMemo(..., [])`, and setters are already stable.
*Expected:* clicking resets the bell to 0 (it keeps ticking up afterward); the button's counter never moves.

## Solutions

### 1. Subscription is by consumption

(a) **False** — destructuring happens *after* `useContext` returns; the subscription is to the whole context value, and any change to it (including the ticking `notifications` inside the same object) wakes the component. (b) **False** — the `useContext(NotificationContext)` call itself subscribes; `UserPanel` would re-render every second whether or not `n` appears in the JSX.

**Why:** a context subscription is created by *consumption*, not by *use*. That's the whole reason splitting works — and also why an idle `useContext` line someone left behind is a real performance bug, not dead code.

### 2. Predict what *really* renders

One tick: interval → `setNotifications` → **`App` re-renders** (it owns the state) → App's JSX re-creates the elements for all three panels → all three re-render, counters in lockstep, exactly like the original. As shipped, splitting the contexts prevented the *context channel* from waking the theme/user panels — but they were never being woken by context alone; they're also `App`'s children, and the parent re-render never went away.

**Why:** a component re-renders when (1) its own state changes, (2) its parent re-renders, or (3) a context it consumes changes. The refactor silenced channel 3 and left channel 2 wide open, because the chatty state still lives in the component that renders everyone. Context splitting is *necessary* here but not *sufficient* — you also need `memo` (exercise 3) or a smaller owner (exercise 4, which is just project 29's colocation aimed at providers).

### 3. Repair #1 — the memo shortcut

```jsx
const ThemePanel = React.memo(function ThemePanel() { ... });   // bodies unchanged
const UserPanel = React.memo(function UserPanel() { ... });
const NotificationBell = React.memo(function NotificationBell() { ... });
```

(a) Tick: `App` re-renders; each memo compares props — none exist, so "unchanged" — and blocks the parent-driven render for all three. But the bell is *subscribed* to `NotificationContext`, whose value (a number) changed — context updates propagate straight through memo — so the bell alone wakes. Theme panel stays asleep only because `themeValue` is `useMemo`'d in `App`: same `[theme]`, same object, no context change. `UserPanel`'s `user` is the same state object every render → quiet. (b) Toggle: memos again block the parent channel; only `themeValue` is rebuilt → only the theme panel wakes.

**Why:** `memo` guards exactly one wake-up channel (parent re-renders); `useContext` is a direct line that bypasses it by design — otherwise a memoized middle component would cut off context for everything beneath it. Note the fragility: this repair needs the provider value memoized *and* every consumer memoized. Exercise 4 removes the whole class of problem instead.

### 4. Repair #2 — providers that own their state

```jsx
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNotifications((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
}

function ThemeToggleButton() {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      toggle theme
    </button>
  );
}

const USER = { name: 'Ada' };

function App() {           // stateless — renders exactly once
  return (
    <ThemeProvider>
      <UserContext.Provider value={USER}>
        <NotificationProvider>
          <h1>Split contexts</h1>
          <ThemeToggleButton />
          <ThemePanel />
          <UserPanel />
          <NotificationBell />
        </NotificationProvider>
      </UserContext.Provider>
    </ThemeProvider>
  );
}
```

**Why:** now a tick re-renders only `NotificationProvider`. Its output is `<Provider value={n}>{children}</Provider>` — and `children` is the *exact same element objects* as last render (they were created by `App`, which didn't re-render). React sees identical elements and bails out of re-rendering that whole subtree — while context propagation still walks past the bailout to wake actual consumers (the bell). Same story for a toggle inside `ThemeProvider`. This is why "provider component that takes `children`" is the canonical shape: it gets you memo-like behavior for free, structurally, with nothing to maintain — project 29's small-owner rule applied to providers.

### 5. Mark-all-read via an actions context

```jsx
const NotificationActionsContext = createContext(null);

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNotifications((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const actions = useMemo(() => ({ markAllRead: () => setNotifications(0) }), []);
  return (
    <NotificationActionsContext.Provider value={actions}>
      <NotificationContext.Provider value={notifications}>
        {children}
      </NotificationContext.Provider>
    </NotificationActionsContext.Provider>
  );
}

let markBtnRenders = 0;
function MarkReadButton() {
  const { markAllRead } = useContext(NotificationActionsContext);
  markBtnRenders++;
  return <button onClick={markAllRead}>mark all read (renders: {markBtnRenders})</button>;
}
// render <MarkReadButton /> next to the bell in App
```

**Why:** the button subscribes only to the actions context, whose value is one object memoized with `[]` — its identity never changes (setters are stable by React's guarantee), so that context *never* fires, and the button's parent (`App`) never re-renders — counter parked at 1 forever. The bell keeps its own subscription to the ticking value. This value/actions split is the last refinement of "what changes together travels together": data changes constantly, the functions that mutate it never do — so they belong on different channels. (Project 41 formalizes exactly this into a store.)
