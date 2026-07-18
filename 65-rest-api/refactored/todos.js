/**
 * The todos feature in three layers — each testable without the one
 * above it, none knowing about the one above it:
 *
 *   repo     — storage. Knows Maps (or, later, a database). No rules.
 *   service  — business rules. Knows todos. No HTTP.
 *   routes   — translation. Knows HTTP. No rules, no storage.
 *
 * "Where does this code go?" now has an answer, which is most of
 * what 'architecture' means day-to-day.
 */
import { HttpError } from './app.js';

// ---------- repo ------------------------------------------------------
export function createRepo() {
  const rows = new Map();
  let nextId = 1;
  return {
    all: () => [...rows.values()],
    get: (id) => rows.get(id),
    insert(fields) {
      const row = { id: nextId++, ...fields };
      rows.set(row.id, row);
      return row;
    },
    update(id, fields) {
      const row = { ...rows.get(id), ...fields };
      rows.set(id, row);
      return row;
    },
    delete: (id) => rows.delete(id),
  };
}

// ---------- service ---------------------------------------------------
// Rules live here: what a valid title is, what ids mean, what
// "not found" is. Throws HttpError — the boundary translates.
export function createService(repo) {
  function parseId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) {
      throw new HttpError(400, `Invalid id: "${raw}"`);
    }
    return id;
  }

  function mustExist(id) {
    const todo = repo.get(id);
    if (!todo) throw new HttpError(404, `No todo with id ${id}`);
    return todo;
  }

  return {
    list: () => repo.all(),

    create({ title } = {}) {
      if (typeof title !== 'string' || title.trim() === '') {
        throw new HttpError(400, 'title must be a non-empty string');
      }
      if (title.length > 200) throw new HttpError(400, 'title too long (max 200)');
      return repo.insert({ title: title.trim(), done: false });
    },

    update(rawId, { title, done } = {}) {
      const id = parseId(rawId);
      mustExist(id);
      const fields = {};
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim() === '') {
          throw new HttpError(400, 'title must be a non-empty string');
        }
        fields.title = title.trim();
      }
      if (done !== undefined) {
        if (typeof done !== 'boolean') throw new HttpError(400, 'done must be a boolean');
        fields.done = done;
      }
      return repo.update(id, fields);
    },

    remove(rawId) {
      const id = parseId(rawId);
      mustExist(id);
      repo.delete(id);
    },
  };
}

// ---------- routes ----------------------------------------------------
// Pure translation: HTTP in, service call, HTTP out. Thin enough
// that there's nowhere for a bug to hide.
export function registerTodoRoutes(app, service) {
  app.get('/todos', (ctx) => ctx.json(200, service.list()));
  app.post('/todos', (ctx) => ctx.json(201, service.create(ctx.body)));
  app.put('/todos/:id', (ctx) => ctx.json(200, service.update(ctx.params.id, ctx.body)));
  app.delete('/todos/:id', (ctx) => {
    service.remove(ctx.params.id);
    ctx.json(204, null);
  });
}
