/**
 * The agent's tool surface: five CRUD tools mirroring a REST resource.
 * Each betaTool bundles definition + run — the SDK runner executes them.
 */
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import * as store from "./store.mjs";

const json = (value) => JSON.stringify(value);

export const tools = [
  betaTool({
    name: "add_session",
    description:
      "Create a new study session. Use when the user reports study or practice " +
      "they completed. Minutes must be a positive whole number.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "What was studied, e.g. 'Effect schema'" },
        minutes: { type: "integer", description: "Duration in minutes, positive" },
        note: { type: "string", description: "Optional short note about how it went" },
      },
      required: ["topic", "minutes"],
      additionalProperties: false,
    },
    run: async (input) => json(await store.addSession(input)),
  }),
  betaTool({
    name: "list_sessions",
    description:
      "List every logged session with its id, topic, minutes, and date. " +
      "Always list before updating or deleting so you use real ids.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => json(await store.listSessions()),
  }),
  betaTool({
    name: "get_session",
    description: "Fetch one session by its id (an id previously seen in list_sessions).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    run: async (input) => json(await store.getSession(input.id)),
  }),
  betaTool({
    name: "update_session",
    description:
      "Change fields of an existing session by id. Only include the fields " +
      "being changed. Fails cleanly if the id does not exist.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        topic: { type: "string" },
        minutes: { type: "integer" },
        note: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    run: async ({ id, ...patch }) => json(await store.updateSession(id, patch)),
  }),
  betaTool({
    name: "delete_session",
    description:
      "Permanently delete a session by id. Destructive: before calling, state " +
      "which session you are about to delete and get the user's confirmation, " +
      "then call with confirm: true. Never set confirm without being told to.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        confirm: { type: "boolean", description: "Must be true; set only after the user confirms" },
      },
      required: ["id", "confirm"],
      additionalProperties: false,
    },
    run: async ({ id, confirm }) =>
      confirm
        ? json(await store.deleteSession(id))
        : json({ ok: false, error: "refused: deletion requires user confirmation (confirm: true)" }),
  }),
];
