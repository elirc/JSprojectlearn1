# 📘 Learning Guide: Context Splitting (Project 33)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A page with three little panels and one button:

- a **theme panel** that shows whether the app is in light or dark mode (and actually turns dark),
- a **user panel** showing the logged-in user's name ("Ada"),
- a **notification bell** showing a count that ticks up by one every second (simulating messages arriving),
- a "toggle theme" button.

Every panel displays its own render counter. You don't even need to click anything to see the original's bug: just watch. The bell ticks every second — and *all three* counters tick with it, even though the theme and user panels have nothing to do with notifications. In the refactor, the bell ticks alone, and toggling the theme wakes only the theme panel.

## 2. Concepts you need first

### The problem context solves: props through strangers

Normally data travels down the tree via props, level by level. When a deeply nested component needs something from the top, every component in between must carry it. **Context** is React's tunnel: a value provided high in the tree that any descendant can read directly, skipping the middle levels. (Project 34's guide covers the prop-drilling story in depth; here we need the mechanics.)

### The three parts of context

```jsx
const ColorContext = createContext(null);          // 1. create (module scope)

function App() {
  return (
    <ColorContext.Provider value="crimson">        {/* 2. provide */}
      <Deep />
    </ColorContext.Provider>
  );
}

function Deep() {
  const color = useContext(ColorContext);          // 3. consume
  return <p style={{ color }}>hello</p>;
}
```

- `createContext(defaultValue)` makes a context object.
- `<X.Provider value={...}>` makes a value available to everything rendered inside it.
- `useContext(X)` in any descendant reads the nearest provider's value. A component that calls this is a **consumer**, and it is now *subscribed*: whenever the provided value changes, React re-renders it.

### The subscription is all-or-nothing

Here is this project's core fact: **a consumer re-renders whenever the context value changes — any part of it.** There is no way to say "I only care about the `theme` field of this object." If the value is one big object and *any* field inside it changes, *every* consumer of that context re-renders, including consumers that read only the untouched fields.

```jsx
// value = { theme, notifications }
// notifications ticks → theme-only consumers re-render anyway
```

So a single fast-changing field (a ticking counter, mouse position, a live feed) makes the *whole* context "chatty," and everyone subscribed pays.

### The fresh-object trap at the provider

Project 30's LEARN.md explains fresh references from scratch. It applies straight to providers:

```jsx
<AppContext.Provider value={{ theme, user }}>  // NEW object every render
```

The object literal is rebuilt each time the provider's component renders. Context decides "did the value change?" by identity (`Object.is`), so a fresh object counts as changed **even when nothing inside it did** — waking every consumer for nothing. The fix is the same as project 30's: `useMemo` the value.

### Splitting by "what changes together"

The design rule: give each independently-changing concern its **own context**. Theme changes rarely; the user changes almost never; notifications change every second. Bundle them and everyone inherits the fastest one's pace. Separate them and each consumer subscribes to exactly the channel it reads. Nested providers look ceremonious but are just wrapping:

```jsx
<ThemeContext.Provider value={themeValue}>
  <NotificationContext.Provider value={count}>
    {children}
  </NotificationContext.Provider>
</ThemeContext.Provider>
```

### setInterval in an effect (brief)

The demo simulates arriving notifications with a timer: `setInterval(fn, 1000)` calls `fn` every second; the effect's cleanup (`clearInterval`) stops it on unmount. Covered fully in the earlier effect projects (18, 25).

## 3. Walking through the original code

```jsx
const AppContext = createContext(null);
```

**One** context for the whole app. The comment admits the trade: "Convenient to set up. Expensive to live with."

```jsx
function ThemePanel() {
  const { theme } = useContext(AppContext);
  themeRenders++;
```

The theme panel consumes `AppContext` and plucks out only `theme`. Note carefully: the *destructuring* (`{ theme } =`) doesn't limit the subscription. Consuming the context subscribes you to the whole value. `UserPanel` and `NotificationBell` do the same with their fields; each increments a global render counter (instrumentation — a visible measurement).

```jsx
React.useEffect(() => {
  const id = setInterval(() => setNotifications((n) => n + 1), 1000);
  return () => clearInterval(id);
}, []);
```

The heartbeat: every second, `notifications` state on `App` goes up by one (using the updater form `n => n + 1`).

```jsx
<AppContext.Provider value={{ theme, setTheme, user, notifications }}>
```

The provider — and both problems on one line. (1) One bundle: theme + user + notifications travel together, so a change to any wakes consumers of all. (2) A fresh object literal every render of `App` — project 30's trap at the provider.

## 4. What's wrong with it (in beginner terms)

On-screen story: load the page and just watch for ten seconds. The bell counts 1, 2, 3... — and the theme panel's render counter reads 2, 3, 4..., in lockstep, and so does the user panel's. Three components repainting every second; one of them has a reason.

Trace one tick:

1. The interval fires → `setNotifications` → `App` re-renders.
2. The provider line runs again → a brand-new `{ theme, setTheme, user, notifications }` object.
3. Context compares: new object ≠ old object → "the value changed."
4. Every consumer re-renders: bell (legitimately — its number changed), theme panel (nothing it reads changed), user panel (nothing it reads changed).

Three panels is a demo. Now imagine the real app this pattern grows into: dozens of components consuming a convenient `AppContext`, and someone adds a websocket message count or the mouse position to it. Result: "the whole app re-renders every second" — and no individual component looks wrong, which makes it miserable to debug. The README's summary: mega-contexts are how "we put it in context for convenience" becomes a full-app performance problem.

And notice problem 2 stands alone: even if notifications never ticked, *any* re-render of `App` for *any* reason would rebuild the value object and wake all consumers — even when literally nothing inside changed.

## 5. Try it yourself first!

1. **Vague:** the theme panel is woken by data it never reads. What's the smallest change to the *shape* of what's provided so that can't happen?
2. **Warmer:** three concerns, three change rates (rare / never / every second). What if each had its own context and its own provider?
3. **Specific:** create `ThemeContext`, `UserContext`, `NotificationContext`; nest three providers in `App`; point each panel's `useContext` at its own context.
4. **One more trap:** after splitting, the theme provider's value is still `{ theme, setTheme }` — an object. What keeps *that* from being fresh every render? (Hint: project 30's tool for state-derived objects.)
5. **Check yourself:** watching the page, only the bell's counter should tick. Toggling the theme should bump only the theme panel's counter.

## 6. Understanding the refactored solution

```jsx
const ThemeContext = createContext(null);
const UserContext = createContext(null);
const NotificationContext = createContext(0);
```

One context **per concern**, split by "what changes together travels together; what changes separately, separately" — the same grouping rule the track applied to state objects earlier. Consumers now subscribe to exactly what they read:

```jsx
function NotificationBell() {
  const notifications = useContext(NotificationContext);
```

```jsx
const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
```

The theme value is an object, so it gets project 30's stabilizer: rebuilt only when `theme` actually changes. On notification ticks, `App` re-renders, but `useMemo` hands back the *same* theme object → theme consumers see "unchanged" → stay asleep. (`setTheme` is stable by React's guarantee, so `[theme]` is an honest deps array.)

Notice `NotificationContext`'s value is just the number `notifications` — primitives compare by value, so no `useMemo` needed. Small contexts often get stability for free; another point in their favor.

```jsx
<ThemeContext.Provider value={themeValue}>
  <UserContext.Provider value={user}>
    <NotificationContext.Provider value={notifications}>
```

Three nested providers — the "ceremony" the README calls the honest price of precision. (Project 41 later packages providers into a tidy store.) The result on screen: the bell ticks alone; the theme toggle wakes one panel.

One extra idea from the README: splitting a fast-changing value out of a context is the same medicine as project 29's colocation — give the chatty thing the smallest possible audience.

## 7. Words you learned (glossary)

- **Context:** React's mechanism for passing a value to any depth without threading props.
- **`createContext`:** creates a context object (done once, at module scope).
- **Provider:** the component (`X.Provider`) that supplies a `value` to everything inside it.
- **Consumer:** a component calling `useContext(X)`; subscribed to that context's value.
- **Subscription:** the standing arrangement "re-render me when this value changes."
- **All-or-nothing subscription:** context has no per-field opt-in; any change to the value wakes every consumer.
- **Mega-context:** one context bundling unrelated concerns; the anti-pattern here.
- **Chatty value:** one that changes frequently (timers, feeds, mouse positions).
- **Fresh reference:** a rebuilt object identical in content but new in identity (project 30's LEARN.md).
- **Stabilizing a provider value:** wrapping it in `useMemo` so identity changes only on real changes.
- **Primitive:** a simple value (number, string, boolean) compared by content, not identity.
- **Instrumentation:** on-screen render counters (project 27's LEARN.md).

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: pages fetch React from a CDN on first load — running needs internet once; reading and predicting don't.)

1. **Un-memo the theme value.** In the refactor, replace `themeValue` with an inline `value={{ theme, setTheme }}`. Prediction: the theme panel starts ticking once per second again — even with split contexts, a fresh provider object wakes its consumers on every `App` render. Both halves of the fix are load-bearing.
2. **Re-merge two contexts.** Move `notifications` into the theme context's object (and its memo deps). Prediction: theme panel ticks with the bell again; user panel stays quiet. Chattiness contaminates exactly the contexts it's bundled into.
3. **Add a second bell.** Render `<NotificationBell />` twice in the refactor. Prediction: both tick every second (both consume the notification context) — and nothing else does. Multiple consumers per context are fine; the point is *which* context they consume.
4. **Slow the firehose.** Change the interval from 1000ms to 100ms in the original. Prediction: all three counters spin ten times faster; the page burns visibly more work. The same edit in the refactor spins only the bell. Change rate is the whole reason splitting matters.
