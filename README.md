# JS Project Learn

**165 projects** that teach **"good code is code that's easy to change"** —
across three tracks:

| Track | Projects | Focus |
|-------|----------|-------|
| **JavaScript** (this page, below) | 01–73 | Fundamentals, refactoring, state, architecture, async, servers, interpreters |
| **[React](react/)** | react/01–50 | Components, hooks, effects, performance, patterns |
| **[TypeScript](typescript/)** | typescript/01–42 | Types that make wrong programs fail to compile |

Do the JS track first — the React and TypeScript tracks deliberately build on
its lessons (and literally import some of its code). Each track has its own
README with the full curriculum. Verification: `npm test` runs every runtime
test suite (all tracks); `npm run typecheck` runs the TypeScript track.

## The JavaScript track (73 projects)

Every folder contains:

- `original.js` (or `original.html`) — a **working** first version, written the way a beginner
  actually writes it. It is not broken; it is just hard to change.
- `refactored/` — the same program, cleaned up, usually with tests.
- `README.md` — a line-by-line explanation of *what* changed and *why it matters*.

**The comparison is the lesson.** Read the original first, form your own opinion of what's
wrong with it, then read the refactor and the README.

## How to run things

- Node projects: `node 01-fizzbuzz/original.js`, `node 01-fizzbuzz/refactored/cli.js`
- Tests (Node 20+): `node --test 01-fizzbuzz/` or `npm test` for everything
- HTML projects: double-click the `.html` file, or open it in a browser

## The curriculum

### Warm-ups: functions, naming, tests
| # | Project | Lesson |
|---|---------|--------|
| 01 | [FizzBuzz](01-fizzbuzz/) | Separate *computing* from *printing*; set up the test workflow |
| 02 | [Count characters](02-count-characters/) | Pure functions, `Map` vs object, edge cases (unicode, `__proto__`) |
| 03 | [ROT13](03-rot13/) | One clean reusable function; magic numbers |
| 04 | [Caesar cipher solver](04-caesar-solver/) | Generalizing *when you need it* (rule of three) |
| 05 | [Text → hex/binary](05-text-to-hex/) | Input validation, small composable functions |
| 06 | [Rock paper scissors](06-rock-paper-scissors/) | Game rules as data, separate from I/O |

### Core problem solving: data structures & algorithms
| # | Project | Lesson |
|---|---------|--------|
| 07 | [Towers of Hanoi](07-towers-of-hanoi/) | Recursion with clean base cases; return data, don't print |
| 08 | [Largest prime factor](08-largest-prime-factor/) | Early returns, performance awareness |
| 09 | [Best stock trade](09-best-stock-trade/) | Naming intermediate values makes an algorithm readable |
| 10 | [RPN calculator](10-rpn-calculator/) | Data-driven dispatch: adding an operator = one line |
| 11 | [Password generator](11-password-generator/) | Options objects vs boolean-flag soup |
| 12 | [Markov sentence generator](12-markov-chain/) | Separate the *build* phase from the *generate* phase |
| 13 | [Cipher suite](13-cipher-suite/) | Interfaces: every cipher has the same shape, plug-in architecture |

### State, UI, and separation of concerns
| # | Project | Lesson |
|---|---------|--------|
| 14 | [To-do list](14-todo-app/) | State lives in data, not in the DOM; render as a function of state |
| 15 | [Simon](15-simon/) | async/await instead of callback pyramids |
| 16 | [Connect Four](16-connect-four/) | Game state / win logic / rendering as separate modules |
| 17 | [Snake](17-snake/) | Game loop; `nextState = step(state)` instead of mutating globals |
| 18 | [Yahtzee scoring](18-yahtzee/) | Scoring rules as pure functions; test-driven development |

### Visual / canvas: math meets code organization
| # | Project | Lesson |
|---|---------|--------|
| 19 | [HSV color](19-hsv-color/) | Conversion functions with round-trip tests |
| 20 | [Complementary colors](20-complementary-colors/) | Reusing #19 instead of rewriting it |
| 21 | [Sierpinski triangle](21-sierpinski/) | Recursion on canvas; config instead of magic numbers |
| 22 | [Ulam spiral](22-ulam-spiral/) | Generators; separating "where" math from "draw" code |
| 23 | [ASCII digital clock](23-ascii-clock/) | Rendering pipeline: data → string → screen |
| 24 | [Image → ASCII art](24-image-to-ascii/) | Processing pipeline with tunable parameters |

### Functions, closures & data (fundamentals, round two)
| # | Project | Lesson |
|---|---------|--------|
| 25 | [Deep equality](25-deep-equal/) | Value vs reference; why JSON comparison lies both ways |
| 26 | [Array utilities](26-array-utils/) | The `.sort()` traps, no-mutation contracts, `keyOf` functions |
| 27 | [Memoize](27-memoize/) | Closures as private state; higher-order functions |
| 28 | [Debounce & throttle](28-debounce-throttle/) | Closures + timers; testing time with mock timers |
| 29 | [Bank account](29-bank-account/) | Encapsulation (`#private` and closures); the `this` trap |

### Robust code: errors, validation, real-world data
| # | Project | Lesson |
|---|---------|--------|
| 30 | [Custom errors](30-custom-errors/) | Throw, don't return sentinels; catch only at the boundary |
| 31 | [Validator](31-validator/) | Composable rule functions; collect ALL errors |
| 32 | [Money & cart](32-money-cart/) | Floating point vs integer cents; `Intl.NumberFormat` |
| 33 | [Date utilities](33-date-utils/) | Date mutation, DST-safe day math, zero-indexed months |
| 34 | [CSV parser](34-csv-parser/) | Why `split()` can't parse; the one-boolean state machine |
| 35 | [Template engine](35-template-engine/) | Regex replace done right; escape-by-default (XSS) |
| 36 | [Log analyzer](36-log-analyzer/) | Regex named groups; parse then analyze |

### Patterns: structures & state
| # | Project | Lesson |
|---|---------|--------|
| 37 | [Tree utilities](37-tree-utils/) | Recursion on nested data; nested loops hardcode depth |
| 38 | [Event emitter](38-event-emitter/) | Pub/sub; unsubscribe handles; listener isolation |
| 39 | [Undo/redo](39-undo-redo/) | Past/present/future — shapes that enforce their invariant |
| 40 | [State machine](40-state-machine/) | Make impossible states unrepresentable; transition tables |
| 41 | [LRU cache](41-lru-cache/) | Map insertion order; one structure beats two + a sync rule |

### Async mastery
| # | Project | Lesson |
|---|---------|--------|
| 42 | [Promise pool](42-promise-pool/) | Concurrency limits; how single-threaded async interleaves |
| 43 | [Retry & timeout](43-retry-timeout/) | Backoff, error classification, `Promise.race` deadlines |
| 44 | [Paginated API](44-paginated-api/) | Async generators; lazy streams that stop fetching early |

### Meta & capstones
| # | Project | Lesson |
|---|---------|--------|
| 45 | [Mini test framework](45-mini-test-framework/) | How test runners work — built in 60 lines, reusing #25 |
| 46 | [Stopwatch](46-stopwatch/) | Timer drift; derive time from the clock, never count ticks |
| 47 | [Quiz app](47-quiz-app/) | Content as data, flow as state |
| 48 | [Memory match](48-memory-match/) | Async races from user input; phase machines close them |
| 49 | [Expression parser](49-expression-parser/) | Tokenize → parse → evaluate; why never `eval` |

### Async, network & Node fundamentals
| # | Project | Lesson |
|---|---------|--------|
| 50 | [CLI weather app](50-weather-cli/) | Secrets in env vars; `res.ok`; typed failures; injectable fetch |
| 51 | [Web scraper](51-web-scraper/) | Politeness delays; retry via #43; parse pure, fetch thin |
| 52 | [Link checker](52-link-checker/) | Crawl queues that grow; visited sets; allSettled thinking |
| 53 | [Pomodoro timer](53-pomodoro/) | A countdown is a future timestamp; Notifications API done politely |
| 54 | [Search as you type](54-search-as-you-type/) | THE out-of-order response race; debounce (#28) + latest-wins tickets |
| 55 | [File-based JSON database](55-json-db/) | Atomic writes (tmp+rename); serialized read-modify-write; a real API |

### Building reusable things: libraries & patterns
| # | Project | Lesson |
|---|---------|--------|
| 56 | [Async event emitter](56-async-emitter/) | Subscription lifecycles via AbortSignal; `waitFor`; leak smoke-alarms |
| 57 | [Promise from scratch](57-my-promise/) | Settle-once state machine + microtasks; thenable adoption; chaining |
| 58 | [Test runner v2](58-test-runner-v2/) | Nested hooks; awaited tests (the false-green bug); .only/.skip |
| 59 | [Reactive state store](59-state-store/) | Mini Redux: one dispatch door, reducer brain, middleware onion |
| 60 | [Client-side router](60-router/) | URL as state; routes as data; a pure matcher with `:params` |
| 61 | [Virtual DOM renderer](61-virtual-dom/) | h() → diff → patch; why keys exist; the DOM as a plugin |

### Real applications: CRUD, persistence, structure
| # | Project | Lesson |
|---|---------|--------|
| 62 | [Markdown previewer](62-markdown-previewer/) | Write the parser yourself; escape-by-default kills XSS structurally |
| 63 | [Expense tracker + charts](63-expense-tracker/) | Stored data is input; integer cents persisted; hand-drawn canvas charts |
| 64 | [Kanban board](64-kanban/) | Drag & drop without the DOM-as-database trap; pure `moveCard` index math |
| 65 | [REST API from scratch](65-rest-api/) | A micro-Express: route table (via #60!), middleware onion, one error boundary; routes→service→repo |
| 66 | [Auth system](66-auth/) | scrypt + salts; HMAC tokens with expiry; constant-time compares; auth as middleware |
| 67 | [WebSocket chat](67-websocket-chat/) | RFC 6455 by hand: framing fixes "TCP is a byte stream"; reconnect with backoff |
| 68 | [Collaborative todos](68-collab-todo/) | The capstone of 65+67: event logs, optimistic UI, convergence, sync conflicts |

### Parsing, interpreters & "hard fun"
| # | Project | Lesson |
|---|---------|--------|
| 69 | [JSON parser](69-json-parser/) | Tokenizer + recursive descent; input stays data; errors get line/column |
| 70 | [Pratt calculator](70-pratt-calculator/) | Precedence as a table; associativity as a number; fixes 49's ladder |
| 71 | [Tiny language](71-tiny-lang/) | Lexer → parser → interpreter; scoping from an environment chain |
| 72 | [Regex engine](72-regex-engine/) | Backtracking: quantifiers as choice points, the call stack as undo log |

### Capstone: performance & polish
| # | Project | Lesson |
|---|---------|--------|
| 73 | [Infinite-scroll gallery](73-infinite-gallery/) | IntersectionObserver over polling; rAF over throttling; virtualized windows |

## The one big idea

Almost every refactor in this repo is the same move applied in a different costume:

> **Split the part that *decides* from the part that *does*.**

Decisions (game rules, scoring, conversions, parsing) become pure functions — same input,
same output, no side effects. Doing (printing, DOM updates, canvas, timers) becomes a thin
layer around them. Pure functions are trivially testable, and the thin I/O layer is too
simple to hide bugs.
