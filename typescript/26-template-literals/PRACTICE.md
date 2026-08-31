# 🏋️ Practice: Template Literal Types

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in a scratch `.ts` file inside the `typescript/` folder (end it with `export {}` so it's a module), or in a COPY of `refactored/events.ts`. Check your work with `npm run typecheck`.

## Exercises

### ⭐ 1. Log lines with a mandatory level tag (warm-up)

Your team's log convention is `[level] message`, where level is `info`, `warn`, or `error`. Write a `LogLine` type that accepts `'[info] cache warmed'` but rejects `'[debug] verbose stuff'` and `'info: cache warmed'`. The message part can be any string.

Practices: mixing a literal-union slot with a `${string}` free-text slot in one template.

Hint: the brackets and the space are literal characters — type them right into the backticks.

Check: the two good lines must compile; add `@ts-expect-error` tests proving the unknown level and the missing brackets are both rejected.

### ⭐⭐ 2. Route keys for a tiny router (core)

A router registers handlers under keys like `'GET /users'`. Write `RouteKey` so a key must be one of the methods `GET`/`POST`/`DELETE`, then a space, then a path starting with `/`. Declare `register(route: RouteKey, handler: () => void): void` (a `declare function` is fine) and exercise it.

Practices: encoding a two-part grammar (finite method union + open-ended path shape) as one template.

Hint: `/${string}` inside the template forces the leading slash; the space before it is part of the pattern too.

Check: `register('GET /users', ...)` must compile; `register('PATCH /users', ...)` and `register('GET users', ...)` must both error with roughly "not assignable to parameter of type 'RouteKey'".

### ⭐⭐ 3. Notification kinds with pairing discipline (core)

Design `NotificationKind` for a messaging system: channel `email` sends templates `welcome`, `receipt`, `password-reset`; channel `sms` sends only `otp`; channel `push` sends `mention` and `reminder`. The trap to avoid: a single `${Channel}:${Template}` cross product would legalize nonsense like `'sms:receipt'`.

Practices: the union-of-templates pattern that pairs each prefix with only its own suffixes.

Hint: this is the same shape as the refactor's three-template `EventName` — one template per channel.

Check: `'email:welcome'`, `'sms:otp'`, `'push:reminder'` must compile; add `@ts-expect-error` tests catching `'sms:receipt'` (valid channel, valid template, wrong pairing) and `'fax:welcome'`.

### ⭐⭐ 4. Deriving setter names (core)

Libraries often derive method names from field names: field `theme` → method `setTheme`. Write `SetterName<K extends string>` producing `` `set${...}` `` with the field name capitalized. Then extend the idea: `ResetName<K>` should produce `resetCacheNow` | `resetCacheLater` style names — the capitalized key followed by `'Now' | 'Later'`.

Practices: `Capitalize` inside a template, and putting a union slot *after* a derived part (cross product on the tail).

Hint: slots can hold generic type parameters, built-in manipulation types, and unions — all in the same backticks.

Check: `const n: SetterName<'theme'> = 'setTheme'` must compile; `'settheme'` must error (case is derived, not optional); `ResetName<'cache'>` must accept both `'resetCacheNow'` and `'resetCacheLater'`.

### ⭐⭐⭐ 5. Typing an untyped animation API (challenge)

You're given an untyped helper: `animate(distance, duration, repeat)` where distance is a CSS length (reuse the refactor's `CssLength` idea), duration is like `'300ms'` or `'1.5s'`, and repeat is like `'2x'` or `'infinite'`. Write `Duration` and `Repeat` types and a fully-typed `declare function animate(...)`. Every parameter should reject free-form strings.

Practices: `${number}` shape slots with unit suffixes across several parameters — turning a stringly-typed API into a checked one.

Hint: `Duration` is a two-way union (`ms` and `s` variants); `Repeat` mixes a `${number}x` shape with one exact literal.

Check: `animate('120px', '300ms', '2x')` and `animate('1.5rem', '0.3s', 'infinite')` must compile; add `@ts-expect-error` tests for `'fast'` as a duration, `'300'` (bare number, no unit), and `'2'` as a repeat.

## Solutions

### 1. LogLine

```ts
type LogLevel = 'info' | 'warn' | 'error';
type LogLine = `[${LogLevel}] ${string}`;

const l1: LogLine = '[info] cache warmed';
// @ts-expect-error — 'debug' is not a level
const l3: LogLine = '[debug] verbose stuff';
// @ts-expect-error — brackets are part of the grammar
const l4: LogLine = 'info: cache warmed';
```

WHY: everything outside `${...}` is literal — the `[`, `]`, and the space must appear exactly. The `LogLevel` slot expands to three prefixes, and `${string}` leaves the message free-form. That's the usual division of labor: finite unions where you want enforcement, `string` where you genuinely accept anything.

### 2. RouteKey

```ts
type Method = 'GET' | 'POST' | 'DELETE';
type RouteKey = `${Method} /${string}`;

declare function register(route: RouteKey, handler: () => void): void;

register('GET /users', () => {});
// @ts-expect-error — PATCH is not a supported method
register('PATCH /users', () => {});
// @ts-expect-error — the space and leading slash are part of the grammar
register('GET users', () => {});
```

WHY: the template concatenates a finite union with the literal characters ` /` and then anything — so both the method set *and* the "space then slash" skeleton are compiler-checked, while paths stay open-ended. This is the halfway point to exercise 28, where `infer` will pull the pieces back *out* of such keys.

### 3. NotificationKind

```ts
type EmailTemplate = 'welcome' | 'receipt' | 'password-reset';
type SmsTemplate = 'otp';
type PushTemplate = 'mention' | 'reminder';

type NotificationKind =
  | `email:${EmailTemplate}`
  | `sms:${SmsTemplate}`
  | `push:${PushTemplate}`;

declare function send(kind: NotificationKind): void;
send('email:welcome');
// @ts-expect-error — valid channel, valid template, wrong pairing
send('sms:receipt');
// @ts-expect-error — unknown channel
send('fax:welcome');
```

WHY: one big `${Channel}:${AllTemplates}` template would multiply *every* channel by *every* template — 18 names, most nonsense. Three separate templates give each channel only its own suffix union (6 legal names), so the wrong-pairing case fails like any other typo. You maintain the per-channel pieces; the compiler maintains the combinations.

### 4. SetterName and ResetName

```ts
type SetterName<K extends string> = `set${Capitalize<K>}`;
type ResetName<K extends string> = `reset${Capitalize<K>}${'Now' | 'Later'}`;

const s1: SetterName<'theme'> = 'setTheme';
const s2: SetterName<'fontSize'> = 'setFontSize';
// @ts-expect-error — capitalization is derived, not optional
const s3: SetterName<'theme'> = 'settheme';
const r1: ResetName<'cache'> = 'resetCacheNow';
```

WHY: `Capitalize<K>` runs at compile time on whatever literal fills `K`, so the camelCase seam (`set` + `Theme`) is derived rather than hand-typed — the `'click'` → `'onClick'` trick pointed at a new convention. `ResetName` shows slots stack: a generic, a manipulation type, and a trailing union in one template, expanding to exactly two names per key.

### 5. The animate API

```ts
type CssLength = `${number}px` | `${number}rem` | '0';
type Duration = `${number}ms` | `${number}s`;
type Repeat = `${number}x` | 'infinite';

declare function animate(distance: CssLength, duration: Duration, repeat: Repeat): void;

animate('120px', '300ms', '2x');
animate('1.5rem', '0.3s', 'infinite');
// @ts-expect-error — words are not durations
animate('120px', 'fast', '2x');
// @ts-expect-error — a bare number has no unit
animate('120px', '300', '2x');
// @ts-expect-error — repeat needs the x suffix or 'infinite'
animate('120px', '300ms', '2');
```

WHY: each parameter gets its own small grammar: `${number}` matches the numeral (decimals included, so `'0.3s'` passes), and the unit suffix is literal. `Repeat` shows a shape-union mixing a pattern with an exact keyword — a very common real-world pair ("a measured value, or one special word"). Remember the refactor's `'12 px'` quirk applies here too: template checking is strong, not perfect, so real boundaries still deserve runtime validation.
