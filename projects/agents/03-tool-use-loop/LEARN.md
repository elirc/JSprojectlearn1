# 03 — The tool-use loop from scratch

Claude Code feels like magic until you have written its core yourself: a
~60-line loop that sends messages, executes the tools the model asks for, and
feeds results back until the model stops asking. This mission builds that
loop with the raw Anthropic SDK and points it at a genuinely failing test,
which it will fix without you touching the code. After this, "agent" stops
being a vibe and becomes a `while` loop you can debug.

## The anatomy of an agent

Strip away every framework and an agent is three parts:

1. **A model** that, given a conversation and a list of tool definitions,
   replies with either text (done) or one or more `tool_use` requests.
2. **An executor** — your code — that runs each requested tool and appends
   the results to the conversation.
3. **A loop** that repeats until the model replies with plain text.

The model never executes anything. It emits *intentions* as JSON; your
executor is the only thing with hands. Every safety property of your agent —
what it can touch, what needs approval — lives in the executor, which is why
you write it rather than the model.

## Tool definitions are prompts with a schema

A tool definition has a `name`, a `description`, and a JSON Schema
`input_schema`. The description is the most underrated prompt text you will
ever write — it is how the model decides *when* to reach for the tool:

```js
{
  name: "run_tests",
  description:
    "Run the fixture test suite with node --test. Returns the full output " +
    "including failure details. Use after every edit to check your progress.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },
}
```

"Use after every edit" is behavioral steering smuggled into a schema. Vague
descriptions produce agents that guess; precise ones produce agents that
follow your intended workflow.

## One turn of the loop

The response's `stop_reason` tells you what the model wants:

- `"tool_use"` — the content contains `tool_use` blocks. Execute each one,
  then send a `user` message whose content is `tool_result` blocks answering
  each `tool_use` by its `id`.
- `"end_turn"` — the model is done; the text blocks are its final answer.

Two rules the API is strict about: the assistant message you append must be
the response's **entire** `content` (not just the text), and if a response
contains several `tool_use` blocks, **all** their `tool_result` blocks go
back in a **single** user message. Splitting them across messages quietly
teaches the model to stop parallelizing.

## Errors are results, not exceptions

When a tool fails — file missing, tests crash — do not throw. Return the
failure text as a `tool_result` with `is_error: true`. The model reads the
error and adapts; that self-correction on rich failure output is most of
what makes agents feel smart. An executor that throws on the first failed
tool has deleted the agent's ability to recover. The same goes for output
you *truncate*: cutting a 400-line test failure down to "tests failed"
starves the model of the stack trace it needed.

## The executor is the security boundary

The model's tool inputs are untrusted output. Our `read_file`/`write_file`
tools resolve paths and refuse anything outside `fixture/` — try asking the
agent to read `../../secrets` and watch the executor say no. Whatever the
tool *can* do, some conversation will eventually make it do; scope tools to
the minimum the task needs, the same way you scoped specs in mission 01.

## What the harness gives you for free (and this loop doesn't)

Running this loop teaches you by absence what Claude Code adds: context
management when the transcript outgrows the window, permission prompts,
parallel tool execution, retries, caching of the stable prefix, transcripts.
The `max_iterations` guard in `agent.mjs` is the smallest of these — without
it, a confused model loops forever on your API bill. When you later
configure the real harness (mission 02's memory files, approval settings),
you now know which layer you are configuring.

## The exercise

`fixture/stats.mjs` has a deliberately broken `median` (it forgets to sort,
and mishandles even-length arrays); `fixture/stats.test.mjs` catches it.

1. Read `src/agent.mjs` and `src/tools.mjs` top to bottom — this is the
   mission's real content, ~120 lines total.
2. Set `ANTHROPIC_API_KEY` (or authenticate however your environment does),
   then:

   ```bash
   npm install
   npm test          # see the fixture fail
   npm run agent     # watch the loop fix it
   npm test          # green
   ```

3. Watch the printed transcript: each tool call, each result, each retry.
   Then `git checkout -- fixture/` and run it again with the model set to
   a smaller model — compare the number of iterations.
4. Extend the loop with one improvement of your choice: a `list_files`
   tool, an approval prompt before `write_file`, or per-turn token
   accounting from `response.usage`.

## Common mistakes

- **Appending only the text block.** The assistant turn must carry the
  `tool_use` blocks too, or the API rejects your `tool_result` as orphaned.
- **One tool_result per message.** All results for one assistant turn go in
  one user message, in any order — they match by `tool_use_id`.
- **Swallowing tool errors.** `is_error: true` with the full output beats a
  thrown exception or a sanitized summary every time.
- **No iteration cap.** Always bound the loop; a stuck agent should fail
  loudly, not spin.
- **String-matching the input JSON.** Parse `tool.input` as an object; its
  serialization (escaping, key order) is not stable across models.
