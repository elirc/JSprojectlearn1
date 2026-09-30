# 04 — A CRUD agent over your own store

Mission 03's loop fixed code; this mission's agent *operates an application*.
You will put a natural-language interface on a Forgelog session store —
"log 25 minutes of Effect study", "what did I do this week?", "delete that
last one" — by exposing CRUD operations as tools. This is the canonical
agentic-CRUD shape: the same architecture, with HTTP in between, is what you
will build against your Effect API after mission 05, and what most
"AI features" in real products amount to.

## From loop to runner

You have earned an abstraction. Having written the loop by hand once, you
now let the SDK drive it: `client.beta.messages.toolRunner()` takes tools
that bundle a definition *and* a `run` function, executes them, feeds
results back, and returns the final message. Compare `src/agent.mjs` here
(~40 lines) with mission 03's (~80): everything that disappeared is the loop
you already understand. The judgment call of *which* layer to work at —
raw loop, SDK runner, full harness — is exactly the "agentic SWE" skill,
and you can now make it from experience instead of faith.

## Tools as an API surface

The five tools in `src/tools.mjs` mirror a REST resource:

| Tool | CRUD | REST equivalent |
|---|---|---|
| `add_session` | Create | `POST /sessions` |
| `list_sessions` | Read | `GET /sessions` |
| `get_session` | Read | `GET /sessions/:id` |
| `update_session` | Update | `PATCH /sessions/:id` |
| `delete_session` | Delete | `DELETE /sessions/:id` |

Designing this surface is API design under a different client. The same
questions apply — what is required, what is defaulted, what errors say —
plus one new one: *can a model use it without guessing?* Every argument the
model must invent is a hallucination opportunity. That is why
`update_session` and `delete_session` take ids the model can only have
gotten from `list_sessions`, and why `list_sessions` returns ids
prominently: the tool surface teaches the workflow read-before-write.

## Validation belongs to the store, not the model

`src/store.mjs` validates every mutation (topic non-blank, minutes a
positive integer) and returns typed refusals. Never assume the model sends
valid input — it is a very fluent, occasionally wrong client. The layering
you built in Effect missions 02–04 pays off conceptually here: the store is
the service, validation errors are the tagged failures, and the agent is
just another caller that must be told "minutes must be positive" in words
it can relay to the user. In mission 06 of this track, you will replace the
hand-rolled checks with your actual `effect/Schema` definitions.

## Destructive actions want friction

`delete_session` demands `confirm: true` in its input, and its description
tells the model to ask the user before setting it. That is a *policy encoded
in the tool contract* — the model can't delete casually, because the schema
makes deletion a deliberate two-step. Approval prompts, dry-run modes, and
soft deletes are the same idea at increasing cost. Decide per tool: reads
free, creates cheap, updates careful, deletes gated.

## State lives outside the conversation

The store persists to `data/sessions.json`, so state survives between runs —
run the agent twice and the second conversation sees the first's sessions.
The conversation is *ephemeral working memory*; the store is *durable
truth*. Keeping that boundary sharp is what makes agents auditable: every
change to durable state went through a named tool with logged input, never
through the model "remembering" something.

## The exercise

1. Read `src/store.mjs` and `src/tools.mjs` — note the runner's
   `betaTool({ ...definition, run })` shape versus mission 03's separated
   definition/executor.
2. With credentials set:

   ```bash
   npm install
   npm run agent -- "log 25 minutes of Effect schema practice, felt solid"
   npm run agent -- "what have I logged so far?"
   npm run agent -- "actually that schema session was 40 minutes"
   npm run agent -- "delete the schema session"   # watch it ask first
   ```

3. Inspect `data/sessions.json` after each command — every mutation should
   be explainable by a tool call you saw printed.
4. Extend it: add a `stats` tool (total minutes per topic) OR a
   `search_sessions` tool, and design the description so the model prefers
   it over fetching everything with `list_sessions`. Test with a prompt
   where the lazy path and the right path differ.

## Common mistakes

- **Fat tools.** One `manage_sessions(action, ...)` mega-tool forces the
  model to guess an action enum. Small, single-purpose tools with sharp
  descriptions get used correctly.
- **Returning prose from tools.** Tools should return compact JSON;
  narration is the model's job. Prose results waste tokens and invite the
  model to parrot instead of reason.
- **Trusting model-supplied ids.** Verify existence and return a clean
  not-found result; the model recovers by re-listing, exactly like a stale
  web client refetching.
- **Letting the model bypass validation.** Every rule lives in the store;
  the tool layer only translates. If the agent can create an invalid
  session, so could any other caller.
