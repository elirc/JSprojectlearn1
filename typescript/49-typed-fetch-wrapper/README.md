# TS 49 — Typed fetch wrapper

**Lesson: a wrapper returning `Promise<any>` doesn't hide boilerplate, it
hides the contract — put the server's routes in ONE endpoint map and every
call site gets checked against it.**

## Run it

```
npm run typecheck
```

## What's wrong with the original?

`api(path: string): Promise<any>` gives each call site permission to invent
its own truth, and four of them do. The server's v2 renamed `done` to
`completed`; the `as Todo[]` casts kept compiling, so `openCount` reads
`todo.done` → `undefined` → `!undefined` → *every* todo counts as open. The
badge is wrong forever, with no crash and no stack trace. `createTodo` POSTs
`{ name }` where the server wants `{ title }` — untitled todos, discovered
by users. And `api('/todo')` (typo) returns a 404 body that is cast to an
array, blowing up three layers away from the typo.

The contract exists. It's just written in a wiki page instead of in the
type system, so `as` is the only thing connecting client to server — and
`as` is a promise, not a check (ts#14).

## What changed in the refactor

- **An endpoint map is the single source of truth**: `interface Endpoints {
  'GET /todos': { res: Todo[] }; 'POST /todos': { body: NewTodo; res: Todo }
  ... }`. Keys are `METHOD path`, so the method can't drift from the route.
- **One generic function serves every route**: `api<K extends Endpoint>(endpoint:
  K, ...args: Args<K>): Promise<Res<K>>`. `Args<K>` is a conditional type
  (ts#27) over a labelled tuple — endpoints with a body require exactly one
  argument, endpoints without one accept none, from a single signature.
- **`unknown` at the boundary, validated on the way in** (ts#13, ts#34): the
  transport returns `unknown`, and a `guards` table — a mapped type keyed by
  the *same* endpoint map, so a missing guard won't compile (ts#12's Record
  idiom) — narrows it or throws `ApiDriftError` naming the endpoint. Runtime
  validation is what earns the compile-time confidence.
- **Every call site lost its cast.** `todoTitles`, `openCount`, `createTodo`
  and `greet` read like ordinary code because the types arrive already
  correct.
- **The type tests replay all four fictions**: the `completed` rename, the
  `{ name }` body, the missing body, the extra body, `'GET /todo'`,
  `'POST /me'`, and reading `.done` off a `User` — nine `@ts-expect-error`
  lines that fail the build the day the model and the map disagree.

## Key takeaway

A network wrapper's return type is the most valuable type in your app — it's
the one place a lie propagates to every screen. Model the API as data (an
endpoint → `{ body, res }` map), make one generic function read that map,
and validate `unknown` once at the door. The wiki page becomes a type, the
casts disappear, and API drift changes from a silent wrong number into a
build failure or a loud, well-named error.
