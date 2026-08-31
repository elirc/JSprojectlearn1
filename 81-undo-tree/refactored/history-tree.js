/**
 * History as a TREE instead of a line.
 *
 * Every version you have ever had is a node with a parent and any number
 * of children. Undo walks UP to the parent; redo walks DOWN to a child;
 * committing a new version adds a child to wherever you are now:
 *
 *              ""                     <- root (id 0)
 *               |
 *     "Fast, safe, cheap"             <- id 1
 *        /            \
 *   "...pick two"   "...all three."   <- ids 2 and 3, both still here
 *
 * Nothing is ever deleted. The linear past/present/future model has to
 * throw the future away when you commit after an undo (project 39), and
 * that discarded future is real work the user did. In a tree, "I went
 * back and tried something else" is just a second child — a branch — so
 * there is nothing to discard and no rule to remember.
 *
 * `jumpTo(id)` is the feature the shape unlocks: any version, at any
 * time, in one step, without walking there.
 *
 * Pure data and pure moves — no console, no files, no timers — so the
 * whole thing is testable in Node, and the CLI in demo.js is a separate
 * 60 lines that only prints.
 */
export class HistoryTree {
  #nodes = new Map(); // id -> { id, state, parentId, childIds, redoChildId }
  #currentId;
  #nextId = 1;

  constructor(initialState) {
    this.#currentId = 0;
    this.#nodes.set(0, { id: 0, state: initialState, parentId: null, childIds: [], redoChildId: null });
  }

  /** The state you are looking at right now. */
  get present() {
    return this.#nodes.get(this.#currentId).state;
  }

  get currentId() {
    return this.#currentId;
  }

  /** Every version ever created — including the ones on other branches. */
  get size() {
    return this.#nodes.size;
  }

  get canUndo() {
    return this.#nodes.get(this.#currentId).parentId !== null;
  }

  get canRedo() {
    return this.#nodes.get(this.#currentId).childIds.length > 0;
  }

  /** Record a new version as a child of the current one. Returns its id. */
  commit(state) {
    const parent = this.#nodes.get(this.#currentId);
    const id = this.#nextId++;

    this.#nodes.set(id, { id, state, parentId: parent.id, childIds: [], redoChildId: null });
    parent.childIds.push(id);
    parent.redoChildId = id; // the branch you just started is the one redo returns to
    this.#currentId = id;
    return id;
  }

  /**
   * Step to the parent. At the root this is a deliberate no-op rather than
   * an error — people mash Ctrl+Z, and that isn't an exceptional condition.
   */
  undo() {
    const node = this.#nodes.get(this.#currentId);
    if (node.parentId === null) return node.state;

    const parent = this.#nodes.get(node.parentId);
    parent.redoChildId = node.id; // remember the way we came, so redo comes back here
    this.#currentId = parent.id;
    return parent.state;
  }

  /**
   * Step to a child. With several children (a fork in your history), the
   * default is the branch you were on most recently — so redo always undoes
   * an undo — and `redo(childId)` picks a specific branch on purpose.
   * That's an API design decision; the tests pin it down.
   */
  redo(childId) {
    const node = this.#nodes.get(this.#currentId);
    if (node.childIds.length === 0) return node.state; // at a leaf: no-op

    const target = childId ?? node.redoChildId ?? node.childIds[node.childIds.length - 1];
    if (!node.childIds.includes(target)) {
      throw new RangeError(`Version ${target} is not a child of ${node.id}`);
    }

    this.#currentId = target;
    return this.#nodes.get(target).state;
  }

  /** Teleport to any version, however far away, in one move. */
  jumpTo(id) {
    if (!this.#nodes.has(id)) throw new RangeError(`No such version: ${id}`);
    this.#currentId = id;
    return this.present;
  }

  /** The ids of the versions branching off one node (default: the current one). */
  children(id = this.#currentId) {
    const node = this.#nodes.get(id);
    if (!node) throw new RangeError(`No such version: ${id}`);
    return [...node.childIds];
  }

  /** The route from the root down to where you are: [0, 1, 4, ...]. */
  path() {
    const ids = [];
    let id = this.#currentId;
    while (id !== null) {
      ids.push(id);
      id = this.#nodes.get(id).parentId;
    }
    return ids.reverse();
  }

  /** One version, copied out so callers can't reach into the tree. */
  node(id) {
    const node = this.#nodes.get(id);
    if (!node) throw new RangeError(`No such version: ${id}`);
    return { id: node.id, state: node.state, parentId: node.parentId, childIds: [...node.childIds] };
  }

  /** The whole tree as nested plain data — for printing, saving, testing. */
  toTree(id = 0) {
    const node = this.#nodes.get(id);
    return {
      id: node.id,
      state: node.state,
      current: node.id === this.#currentId,
      children: node.childIds.map((childId) => this.toTree(childId)),
    };
  }
}
