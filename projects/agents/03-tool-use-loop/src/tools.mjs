/**
 * Tool definitions + executor. The executor is the security boundary: the
 * model only ever emits intentions; this file decides what actually runs.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(projectRoot, "fixture");

/** Confine a model-supplied path to fixture/. Untrusted input, always. */
function resolveFixturePath(relative) {
  const resolved = path.resolve(fixtureRoot, relative);
  if (resolved !== fixtureRoot && !resolved.startsWith(fixtureRoot + path.sep)) {
    throw new Error(`path escapes fixture/: ${relative}`);
  }
  return resolved;
}

export const toolDefinitions = [
  {
    name: "read_file",
    description:
      "Read a file inside the fixture/ directory. Path is relative to fixture/, " +
      "e.g. 'stats.mjs'. Read a file before editing it.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "Path relative to fixture/" } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    name: "write_file",
    description:
      "Overwrite a file inside the fixture/ directory with new content. " +
      "Never edit *.test.mjs files — fix the implementation instead.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to fixture/" },
        content: { type: "string", description: "Full new file content" },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },
  },
  {
    name: "run_tests",
    description:
      "Run the fixture test suite with `node --test`. Returns the full output " +
      "including failure details. Use after every edit to check your progress.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

/** Execute one tool call. Returns { content, isError } — never throws. */
export async function executeTool(name, input) {
  try {
    switch (name) {
      case "read_file":
        return { content: await readFile(resolveFixturePath(input.path), "utf8"), isError: false };
      case "write_file": {
        if (/\.test\.mjs$/.test(input.path)) {
          return { content: "refused: test files are read-only", isError: true };
        }
        await writeFile(resolveFixturePath(input.path), input.content, "utf8");
        return { content: `wrote ${input.path} (${input.content.length} chars)`, isError: false };
      }
      case "run_tests": {
        try {
          const { stdout, stderr } = await run("node", ["--test", "fixture/"], {
            cwd: projectRoot,
            shell: process.platform === "win32",
          });
          return { content: `${stdout}\n${stderr}`.trim(), isError: false };
        } catch (error) {
          // Failing tests exit non-zero — that is a RESULT the model needs
          // in full, not an exception.
          return { content: `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim(), isError: true };
        }
      }
      default:
        return { content: `unknown tool: ${name}`, isError: true };
    }
  } catch (error) {
    return { content: String(error), isError: true };
  }
}
