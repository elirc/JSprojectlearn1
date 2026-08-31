/**
 * Everything the palette DECIDES, with no React and no DOM:
 *
 *   fuzzyMatch(query, text)      does this text match, and how well?
 *   rankCommands(commands, q)    which commands, in what order?
 *   matchesCombo(combo, event)   was that the shortcut?
 *   commands                     the registry — commands as DATA
 *
 * The registry is the point of the whole project. A command is an object
 * with an id, a title, some search keywords, and a `run` that receives an
 * `actions` bag from the app. Nothing here imports React, nothing here
 * touches a DOM node, and nothing here knows what a palette looks like —
 * so all of it, including every command's behaviour, is testable in Node.
 * This is js#10's data-driven dispatch (a table, not an if-chain) wearing
 * React clothes.
 */

/**
 * Subsequence ("fuzzy") match: every character of the query must appear
 * in the text, in order, but not necessarily adjacent — so `tdm` finds
 * "Toggle dark mode".
 *
 * Returns `null` for no match, otherwise `{ score, positions }` where
 * `positions` are the matched indexes (enough to highlight them).
 *
 * The score is small integer arithmetic, deliberately:
 *   +1   per matched character
 *   +4   when a match is adjacent to the previous one (typed a real word)
 *   +3   when a match starts a word (the initials people actually type)
 * then `score * 100 - firstMatchIndex`, so an earlier first hit breaks
 * ties without ever outweighing a genuinely better match.
 */
export function fuzzyMatch(query, text) {
  const q = String(query).trim().toLowerCase();
  const t = String(text).toLowerCase();
  if (q === '') return { score: 0, positions: [] }; // empty query matches everything

  const positions = [];
  let score = 0;
  let from = 0;
  let prev = -2;

  for (const ch of q) {
    if (ch === ' ') continue; // spaces separate words in the query, they aren't characters
    const found = t.indexOf(ch, from);
    if (found === -1) return null; // a character with nowhere to go: no match
    score += 1;
    if (found === prev + 1) score += 4; // consecutive
    if (found === 0 || /[\s\-_.]/.test(t[found - 1])) score += 3; // word start
    positions.push(found);
    prev = found;
    from = found + 1;
  }
  if (positions.length === 0) return { score: 0, positions: [] }; // query was all spaces
  return { score: score * 100 - positions[0], positions };
}

/**
 * Filter and order a command list for a query. Each command is matched
 * against its title and each of its keywords; the best of those wins.
 * Non-matching commands are dropped. An empty query returns the registry
 * untouched, in registry order — which is a design decision, not a
 * shortcut: the order you wrote the commands in is the order a new user
 * should meet them.
 *
 * Returns new objects (`{ ...cmd, score, positions }`); never mutates.
 */
export function rankCommands(commands, query) {
  if (String(query).trim() === '') return commands;

  return commands
    .map((cmd) => {
      const titleMatch = fuzzyMatch(query, cmd.title);
      let best = titleMatch && { ...titleMatch, onTitle: true };
      for (const keyword of cmd.keywords || []) {
        const m = fuzzyMatch(query, keyword);
        if (m && (!best || m.score > best.score)) best = { ...m, onTitle: false };
      }
      if (!best) return null;
      return {
        ...cmd,
        score: best.score,
        // highlight positions only make sense against the title
        positions: best.onTitle ? best.positions : [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score); // Array#sort is stable: ties keep registry order
}

/**
 * Does this keyboard event match a combo like `mod+k`, `escape`, or
 * `mod+shift+p`? `mod` means Ctrl on Windows/Linux and Cmd on a Mac.
 *
 * Takes a plain object, not a real KeyboardEvent, so the tests can pass
 * `{ key: 'k', ctrlKey: true }` and be done.
 */
export function matchesCombo(combo, event) {
  const parts = String(combo).toLowerCase().split('+').map((p) => p.trim());
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));

  const wantsMod = mods.has('mod');
  const hasMod = Boolean(event.ctrlKey || event.metaKey);
  if (wantsMod !== hasMod) return false;
  if (mods.has('shift') !== Boolean(event.shiftKey)) return false;
  if (mods.has('alt') !== Boolean(event.altKey)) return false;
  return String(event.key || '').toLowerCase() === key;
}

/**
 * THE REGISTRY. Adding a command is adding one object to this array —
 * that is the entire diff. `run` receives the app's `actions` bag, which
 * is what keeps this file free of React while still describing behaviour.
 */
export const commands = [
  {
    id: 'theme.toggle',
    title: 'Toggle dark mode',
    keywords: ['theme', 'appearance', 'night', 'light'],
    run: (actions) => actions.toggleTheme(),
  },
  {
    id: 'font.increase',
    title: 'Increase font size',
    keywords: ['bigger', 'zoom in', 'text'],
    run: (actions) => actions.setFontSize((size) => Math.min(size + 2, 32)),
  },
  {
    id: 'font.decrease',
    title: 'Decrease font size',
    keywords: ['smaller', 'zoom out', 'text'],
    run: (actions) => actions.setFontSize((size) => Math.max(size - 2, 10)),
  },
  {
    id: 'font.reset',
    title: 'Reset font size',
    keywords: ['default', 'text'],
    run: (actions) => actions.setFontSize(() => 16),
  },
  {
    id: 'log.hello',
    title: 'Say hello',
    keywords: ['greet', 'wave'],
    run: (actions) => actions.log('hello 👋'),
  },
  {
    id: 'log.clear',
    title: 'Clear the log',
    keywords: ['empty', 'erase', 'delete'],
    run: (actions) => actions.clearLog(),
  },
  {
    id: 'help.about',
    title: 'About this palette',
    keywords: ['help', 'info', 'version'],
    run: (actions) => actions.log('A command palette in about 90 lines of glue.'),
  },
];
