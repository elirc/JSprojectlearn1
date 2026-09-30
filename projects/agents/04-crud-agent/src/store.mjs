/**
 * Forgelog session store: validated CRUD over a JSON file.
 * All rules live HERE — the agent is just another untrusted caller.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const dataFile = path.join(dataDir, "sessions.json");

async function load() {
  try {
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch {
    return { nextId: 1, sessions: [] };
  }
}

async function save(state) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2) + "\n", "utf8");
}

/** Returns null when valid, else a message the agent can relay verbatim. */
export function validateInput({ topic, minutes }) {
  if (typeof topic !== "string" || topic.trim() === "") return "topic must be a non-empty string";
  if (!Number.isInteger(minutes) || minutes <= 0) return "minutes must be a positive integer";
  return null;
}

export async function addSession({ topic, minutes, note }) {
  const invalid = validateInput({ topic, minutes });
  if (invalid) return { ok: false, error: invalid };
  const state = await load();
  const session = {
    id: `s_${state.nextId}`,
    topic: topic.trim(),
    minutes,
    ...(note ? { note } : {}),
    loggedAt: new Date().toISOString(),
  };
  state.nextId += 1;
  state.sessions.push(session);
  await save(state);
  return { ok: true, session };
}

export async function listSessions() {
  const state = await load();
  return { ok: true, count: state.sessions.length, sessions: state.sessions };
}

export async function getSession(id) {
  const state = await load();
  const session = state.sessions.find((s) => s.id === id);
  return session ? { ok: true, session } : { ok: false, error: `no session with id ${id}` };
}

export async function updateSession(id, patch) {
  const state = await load();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) return { ok: false, error: `no session with id ${id}` };
  const merged = { ...session, ...patch };
  const invalid = validateInput(merged);
  if (invalid) return { ok: false, error: invalid };
  Object.assign(session, patch, { topic: merged.topic.trim() });
  await save(state);
  return { ok: true, session };
}

export async function deleteSession(id) {
  const state = await load();
  const index = state.sessions.findIndex((s) => s.id === id);
  if (index === -1) return { ok: false, error: `no session with id ${id}` };
  const [removed] = state.sessions.splice(index, 1);
  await save(state);
  return { ok: true, removed };
}
