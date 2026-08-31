# 🏋️ Practice: Optional Fields

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Write your code in a scratch file inside this folder (e.g. `practice.ts`) — `npm run typecheck` from the `typescript/` folder picks it up.

## Exercises

### ⭐ 1. `?` vs `| undefined`, hands on (warm-up)

Define `interface LoosePrefs { nickname?: string }` and `interface StrictPrefs { nickname: string | undefined }`. Then try to build each one from `{}`, from `{ nickname: undefined }`, and from `{ nickname: 'ada' }` — six attempts total. Predict each outcome before you type it.

**Practices:** feeling the difference between "may be omitted" and "must be written, may be empty."
**Hint:** exactly one of the six must fail.
**Check:** `const s: StrictPrefs = {}` must error with roughly `Property 'nickname' is missing`; the other five must compile.

### ⭐⭐ 2. Build your own input/internal pair (core)

Model an email invite. Callers may provide `to` (required), and optionally `subject` and `cc`. Internally the app wants everything resolved: `subject` defaults to `'(no subject)'`, `cc` defaults to `[]`, and `sentAt` is `Date | undefined` (nothing has been sent yet — but the field must exist). Write `InviteInput`, `Invite`, and `resolveInvite(input: InviteInput): Invite`.

**Practices:** the two-types-one-boundary pattern on a fresh domain.
**Hint:** `sentAt` never comes from the caller — the boundary decides it.
**Check:** `resolveInvite({ to: 'grace@navy.mil' })` must compile; building an `Invite` literal without `cc` must error with roughly `Property 'cc' is missing`.

### ⭐⭐ 3. De-`!` this function (core)

This compiles — and lies three times. Rewrite it with zero `!`, keeping the signature, by choosing a default for each field (`'default'`, `3`, `250`).

```ts
interface RetryConfig { retries?: number; delayMs?: number; label?: string }
function planRetries(config: RetryConfig): string {
  return `${config.label!.toUpperCase()}: ${config.retries! * 2} tries, ${config.delayMs! + 100}ms`;
}
```

**Practices:** replacing assertions with `??` defaults.
**Hint:** resolve each field into a local `const` first — the math reads better and each default is decided once.
**Check:** your version must compile with no `!` anywhere, and `planRetries({})` must be a legal call. As a bonus test, `config.retries * 2` without `??` must error with roughly `'config.retries' is possibly 'undefined'`.

### ⭐⭐ 4. Optional all the way down (core)

Model `interface MemberProfile { name: string; social?: { twitter?: string; github?: string } }` — two layers of maybe. Write `twitterTag(profile: MemberProfile): string | undefined` returning `'@' + handle` when a handle exists and `undefined` otherwise.

**Practices:** `?.` through nested optionals, and honest `| undefined` return types.
**Hint:** grab `profile.social?.twitter` into a local first, then branch on it once.
**Check:** must compile; the naive `profile.social.twitter` must error with roughly `'profile.social' is possibly 'undefined'`.

### ⭐⭐⭐ 5. The three-situations audit (challenge)

Design a server config. Callers supply: `host` (required — there is no sane default), `port` (optional, default `8080`), and `tls` (an object with `certPath` and `keyPath` — *genuinely* optional: plain-HTTP servers exist, so no default is possible). Write `ServerConfigInput`, `ServerConfig` (with `tls: TlsFiles | undefined`), `resolveServerConfig`, and `describeServer(config: ServerConfig): string` that prints `http`/`https` depending on `tls`.

**Practices:** classifying every field as required / defaulted / genuinely-maybe, then encoding each classification.
**Hint:** in `describeServer`, one comparison against `undefined` should narrow `tls` for everything after it.
**Check:** `resolveServerConfig({ host: 'localhost' })` must compile; `resolveServerConfig({ port: 3000 })` must error with roughly `Property 'host' is missing`; inside `describeServer`, `config.tls.certPath` without a check must error with `possibly 'undefined'`.

## Solutions

### Solution 1

```ts
interface LoosePrefs { nickname?: string }
interface StrictPrefs { nickname: string | undefined }

const a1: LoosePrefs = {};
const a2: LoosePrefs = { nickname: undefined };
const a3: LoosePrefs = { nickname: 'ada' };

// @ts-expect-error — nickname must be written, even if undefined
const b1: StrictPrefs = {};
const b2: StrictPrefs = { nickname: undefined };
const b3: StrictPrefs = { nickname: 'ada' };
```

WHY: `?` permits *omission* — the key may not exist at all — while `| undefined` demands the key exists even when its value is empty. That single failing case (`b1`) is the feature: every construction site of a `StrictPrefs` is forced to consciously decide about `nickname`, which is exactly how the refactor keeps `email` from being silently forgotten.

### Solution 2

```ts
interface InviteInput {
  to: string;
  subject?: string;
  cc?: string[];
}

interface Invite {
  to: string;
  subject: string;
  cc: string[];
  sentAt: Date | undefined;
}

function resolveInvite(input: InviteInput): Invite {
  return {
    to: input.to,
    subject: input.subject ?? '(no subject)',
    cc: input.cc ?? [],
    sentAt: undefined, // not sent yet — the field is consciously present
  };
}
```

WHY: the lenient shape (`?` where omission is honest) lives at the edge; the strict shape (everything present) is what the rest of the app touches, so no downstream code ever writes `??` or `!` for `subject` or `cc` again. `sentAt` is the "genuinely maybe" case: `| undefined` instead of `?` means no builder of an `Invite` can just forget it.

### Solution 3

```ts
interface RetryConfig { retries?: number; delayMs?: number; label?: string }

function planRetries(config: RetryConfig): string {
  const label = (config.label ?? 'default').toUpperCase();
  const retries = (config.retries ?? 3) * 2;
  const delay = (config.delayMs ?? 250) + 100;
  return `${label}: ${retries} tries, ${delay}ms`;
}
```

WHY: each `!` was a promise the type couldn't back up — `planRetries({})` would have produced a crash and two NaNs. `??` answers the compiler's question ("what if it's missing?") with an actual decision instead of a bluff. Pulling each resolution into a `const` also keeps every default in one visible line, halfway to the full `resolveX` boundary pattern of exercise 2.

### Solution 4

```ts
interface SocialLinks {
  twitter?: string;
  github?: string;
}

interface MemberProfile {
  name: string;
  social?: SocialLinks;
}

function twitterTag(profile: MemberProfile): string | undefined {
  const handle = profile.social?.twitter;
  return handle === undefined ? undefined : `@${handle}`;
}
```

WHY: `profile.social?.twitter` collapses two layers of maybe into one `string | undefined` local, so the function branches exactly once. The return type is honestly `string | undefined` — the "no handle" case is real, and callers should be forced to handle it rather than receive a fake `'@undefined'` string (which is what a template literal without the branch would happily produce).

### Solution 5

```ts
interface TlsFiles {
  certPath: string;
  keyPath: string;
}

interface ServerConfigInput {
  host: string;   // required: no ?
  port?: number;  // optional-with-default
  tls?: TlsFiles; // genuinely maybe: plain-HTTP servers exist
}

interface ServerConfig {
  host: string;
  port: number;
  tls: TlsFiles | undefined;
}

function resolveServerConfig(input: ServerConfigInput): ServerConfig {
  return {
    host: input.host,
    port: input.port ?? 8080,
    tls: input.tls,
  };
}

function describeServer(config: ServerConfig): string {
  const scheme = config.tls === undefined ? 'http' : 'https';
  const cert = config.tls === undefined ? 'no cert' : config.tls.certPath;
  return `${scheme} on ${config.host}:${config.port} (${cert})`;
}
```

WHY: all three situations appear once each, and each gets its true encoding: `host` has no `?` anywhere (a config without a host is meaningless, so reject it at compile time); `port` is lenient outside, resolved to `number` inside, so the app never writes `?? 8080` twice; `tls` has no default that could exist, so it stays `TlsFiles | undefined` and `describeServer` is forced into the http/https branch — which was a real product behavior, not ceremony. Every `!` this design *would* have needed is structurally unnecessary.
