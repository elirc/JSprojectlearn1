/**
 * The whole agent: a while-loop over the Messages API.
 * Run with: npm run agent   (requires Anthropic credentials in the env)
 */
import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, executeTool } from "./tools.mjs";

const MODEL = process.env.AGENT_MODEL ?? "claude-opus-5-5";
const MAX_ITERATIONS = 15;

const client = new Anthropic();

const TASK = `The test suite in fixture/ is failing. Find the bug in the
implementation and fix it. Do not modify test files. Finish by running the
tests and confirming they pass, then summarize the bug in two sentences.`;

const messages = [{ role: "user", content: TASK }];

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system:
      "You are a careful software engineer fixing a small Node.js project. " +
      "Work strictly through the provided tools.",
    tools: toolDefinitions,
    messages,
  });

  // The assistant turn must be the ENTIRE content — tool_use blocks included.
  messages.push({ role: "assistant", content: response.content });

  for (const block of response.content) {
    if (block.type === "text" && block.text.trim()) {
      console.log(`\n[model] ${block.text.trim()}`);
    }
  }

  if (response.stop_reason === "end_turn") {
    console.log(`\ndone in ${iteration} iteration(s).`);
    process.exit(0);
  }

  if (response.stop_reason !== "tool_use") {
    console.error(`\nstopped: unexpected stop_reason "${response.stop_reason}"`);
    process.exit(1);
  }

  const toolUses = response.content.filter((block) => block.type === "tool_use");
  const results = [];
  for (const toolUse of toolUses) {
    console.log(`\n[tool] ${toolUse.name} ${JSON.stringify(toolUse.input).slice(0, 120)}`);
    const { content, isError } = await executeTool(toolUse.name, toolUse.input);
    console.log(isError ? `[tool error]\n${content}` : `[tool ok]\n${content.slice(0, 800)}`);
    results.push({
      type: "tool_result",
      tool_use_id: toolUse.id,
      content,
      is_error: isError,
    });
  }

  // ALL results for this assistant turn go back in ONE user message.
  messages.push({ role: "user", content: results });
}

console.error(`\ngave up after ${MAX_ITERATIONS} iterations — inspect the transcript above.`);
process.exit(1);
