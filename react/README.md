# React track — 50 projects

Same method as the JS track: every folder has a **working but flawed** `original.html`,
a `refactored/` version, and a `README.md` explaining what changed and why. The flaw
is never "it doesn't render" — it's a real bug, a real performance trap, or code that
fights React instead of using it.

## Setup (none)

Every project is a single HTML file using React 18 + Babel standalone from a CDN —
double-click to run (internet required on first load). Real projects use a bundler
(Vite); the README of project 01 explains what the CDN setup replaces. A few projects
extract pure logic (reducers) into `.js` modules tested with `node --test` — the
"decide vs do" split from the JS track, applied to React.

## The curriculum

### Components & props (01–08)
| # | Project | Lesson |
|---|---------|--------|
| 01 | component-extraction | One giant component vs small components + props |
| 02 | list-from-data | Copy-pasted JSX vs `map` over data |
| 03 | key-prop | Why index-as-key corrupts state (live bug) |
| 04 | conditional-render | Ternary soup; the `&&` renders-a-zero gotcha |
| 05 | props-design | Boolean-prop soup vs variants and options (js#11) |
| 06 | children-composition | Slot-prop explosion vs `children` |
| 07 | controlled-inputs | DOM-poking forms vs controlled inputs |
| 08 | lifting-state | Duplicated sibling state vs lifting it up |

### State & events (09–16)
| # | Project | Lesson |
|---|---------|--------|
| 09 | derived-state | Storing what you can compute — the #1 React smell |
| 10 | state-mutation | Mutating state and wondering why nothing re-renders |
| 11 | stale-closures | `setCount(count + 1)` in a timer; updater functions |
| 12 | form-state | Ten `useState`s vs one object + generic handler |
| 13 | usereducer-todo | Reducers are pure functions — extracted and unit-tested |
| 14 | event-handlers | `onClick={fn()}` and friends |
| 15 | dom-vs-state | Poking classLists via refs vs state-driven rendering |
| 16 | wizard-phases | Boolean soup vs a phase machine (js#40) |

### Effects & data (17–26)
| # | Project | Lesson |
|---|---------|--------|
| 17 | effect-deps | The missing deps array = a fetch storm |
| 18 | effect-cleanup | Leaked intervals and listeners on unmount |
| 19 | fetch-race | Slow old responses overwriting new ones |
| 20 | fetch-status | Three booleans vs one discriminated status |
| 21 | no-effect-needed | Effects that just compute — delete them |
| 22 | custom-hook-usefetch | Duplicated effect logic vs a custom hook |
| 23 | usepersistentstate | localStorage sync as a reusable hook |
| 24 | usedebouncedvalue | Debounce done wrong in components (js#28) |
| 25 | useinterval | Timers + hooks; the latest-ref pattern |
| 26 | refs-for-values | Values that shouldn't cause re-renders |

### Rendering & performance (27–33)
| # | Project | Lesson |
|---|---------|--------|
| 27 | usememo | Expensive work every keystroke; when memo helps (and when not) |
| 28 | memo-usecallback | `React.memo` defeated by fresh function props |
| 29 | state-colocation | Typing lags the whole app: push state down |
| 30 | stable-props | Inline objects/arrays silently break memoization |
| 31 | key-reset | Resetting component state with `key` vs syncing effects |
| 32 | preserve-state | Conditional unmount wipes state; structure decides lifetime |
| 33 | context-splitting | One mega-context re-renders everything |

### Patterns & architecture (34–42)
| # | Project | Lesson |
|---|---------|--------|
| 34 | context-theme | Prop drilling vs Context, and Context's real cost |
| 35 | compound-tabs | Config-object APIs vs compound components |
| 36 | controlled-component-api | Who owns the state? value/onChange contracts |
| 37 | error-boundary | One crash white-screens the app |
| 38 | portal-modal | z-index wars vs `createPortal` |
| 39 | optimistic-updates | Click, wait, update vs optimistic UI + rollback |
| 40 | undo-redo | js#39's History class inside a reducer |
| 41 | mini-store | useReducer + Context = Redux from scratch |
| 42 | hash-router | View state that survives refresh: URL as state |

### Apps & capstones (43–50)
| # | Project | Lesson |
|---|---------|--------|
| 43 | form-validation | js#31's validator wired into React forms |
| 44 | async-submit | The double-submit bug; pending state |
| 45 | searchable-table | Filter + sort + paginate as a derived pipeline (js#26) |
| 46 | shopping-cart | js#32's integer cents in a reducer cart |
| 47 | stopwatch-react | js#46's derive-from-clock lesson, React edition |
| 48 | quiz-react | js#47's quiz rebuilt idiomatically — compare them |
| 49 | todo-capstone | js#14 full circle: reducer, filters, persistence |
| 50 | build-your-own-hooks | Implement useState/useEffect in ~50 lines — demystified |

## The React one big idea

React's contract is: **UI = f(state)**. You declare what the screen looks like for a
given state; React makes the DOM match. Almost every original in this track breaks
that contract somewhere — state hidden in the DOM, in closures, in refs, in effects —
and almost every refactor is the same move: put the state in one right place, derive
everything else, and let render be a pure function of it. The JS track taught
"separate deciding from doing"; React industrializes it.
