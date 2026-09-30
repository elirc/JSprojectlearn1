/**
 * Natural-language CRUD over the Forgelog store, via the SDK tool runner.
 * Run with: npm run agent -- "log 25 minutes of Effect schema practice"
 * (Compare with mission 03's hand-written loop — the runner IS that loop.)
 */
import Anthropic from "@anthropic-ai/sdk";
import { tools } from "./tools.mjs";

const request = process.argv.slice(2).join(" ").trim();
if (!request) {
  console.error('usage: npm run agent -- "<what you want done>"');
  process.exit(1);
}

const client = new Anthropic();

const runner = client.beta.messages.toolRunner({
  model: process.env.AGENT_MODEL ?? "claude-opus-5-5",
  max_tokens: 16000,
  max_iterations: 10,
  system:
    "You are Forgelog, a study-session tracker. Manage the user's sessions " +
    "strictly through the provided tools — never invent ids or data you have " +
    "not read from a tool result. Today is " + new Date().toDateString() + ". " +
    "Relay validation errors in plain words. Be brief.",
  tools,
  messages: [{ role: "user", content: request }],
});

// Iterate so every intermediate tool call is visible — the transcript is the lesson.
for await (const message of runner) {
  for (const block of message.content) {
    if (block.type === "tool_use") {
      console.log(`[tool] ${block.name} ${JSON.stringify(block.input)}`);
    }
  }
}

const finalMessage = await runner.done();
for (const block of finalMessage.content) {
  if (block.type === "text" && block.text.trim()) console.log(`\n${block.text.trim()}`);
}
