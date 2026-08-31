// A command palette, tested without a keyboard, a browser, or a render.
// Everything that DECIDES lives in palette.js — including what each
// command does, because a command is data with a `run` that takes the
// app's actions as an argument.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyMatch, rankCommands, matchesCombo, commands } from './palette.js';

// ---- fuzzyMatch ---------------------------------------------------------

test('a fuzzy match is a subsequence: the initials people actually type', () => {
  const match = fuzzyMatch('tdm', 'Toggle dark mode');
  assert.deepEqual(match.positions, [0, 7, 12]);
  assert.equal(match.score, 1200); // 3 chars + 3 word starts, times 100, first hit at 0
});

test('order matters — the same letters backwards do not match', () => {
  assert.equal(fuzzyMatch('mdt', 'Toggle dark mode'), null);
});

test('a character with nowhere left to go means no match', () => {
  assert.equal(fuzzyMatch('zebra', 'Toggle dark mode'), null);
  assert.equal(fuzzyMatch('modes', 'Toggle dark mode'), null); // no 's' after the 'e'
});

test('matching ignores case on both sides', () => {
  assert.ok(fuzzyMatch('DARK', 'toggle dark mode'));
  assert.ok(fuzzyMatch('dark', 'TOGGLE DARK MODE'));
});

test('an empty query matches everything, with no highlight', () => {
  assert.deepEqual(fuzzyMatch('', 'anything'), { score: 0, positions: [] });
  assert.deepEqual(fuzzyMatch('   ', 'anything'), { score: 0, positions: [] });
});

test('a typed word beats the same letters scattered', () => {
  const together = fuzzyMatch('dark', 'Toggle dark mode');
  const scattered = fuzzyMatch('tgdk', 'Toggle dark mode');
  assert.ok(together.score > scattered.score);
});

test('positions point at the characters that matched', () => {
  const text = 'Reset font size';
  const { positions } = fuzzyMatch('font', text);
  assert.equal(positions.map((i) => text[i]).join(''), 'font');
});

// ---- rankCommands -------------------------------------------------------

const fixture = [
  { id: 'a', title: 'Open file', keywords: ['load'] },
  { id: 'b', title: 'Open folder', keywords: ['directory'] },
  { id: 'c', title: 'Save as', keywords: [] },
];

test('an empty query returns the registry untouched, in registry order', () => {
  assert.equal(rankCommands(fixture, ''), fixture); // same array back: no work done
  assert.equal(rankCommands(fixture, '   '), fixture);
});

test('commands that cannot match are dropped', () => {
  assert.deepEqual(rankCommands(fixture, 'zzz'), []);
  assert.deepEqual(rankCommands(fixture, 'save').map((c) => c.id), ['c']);
});

test('the best match comes first', () => {
  assert.deepEqual(rankCommands(commands, 'dark').map((c) => c.id), ['theme.toggle']);
  assert.equal(rankCommands(commands, 'clear')[0].id, 'log.clear');
});

test('ties keep registry order (a stable sort is a UX decision)', () => {
  // "Increase font size" and "Decrease font size" score identically;
  // "Reset font size" wins only because its match starts earlier.
  assert.deepEqual(rankCommands(commands, 'font').map((c) => c.id), [
    'font.reset',
    'font.increase',
    'font.decrease',
  ]);
});

test('keywords widen the net without lying about the highlight', () => {
  const found = rankCommands(commands, 'theme');
  assert.deepEqual(found.map((c) => c.id), ['theme.toggle']);
  assert.deepEqual(found[0].positions, []); // matched a keyword, so nothing to underline

  // "erase" is a keyword of Clear the log — and also, honestly, a
  // subsequence of "D-e-c-r-e-a-s-e". Fuzzy search is generous; ranking
  // is what makes that acceptable.
  assert.deepEqual(rankCommands(commands, 'erase').map((c) => c.id),
    ['log.clear', 'font.decrease']);
});

test('ranking never mutates the registry', () => {
  const before = JSON.stringify(commands.map((c) => c.id));
  rankCommands(commands, 'font');
  rankCommands(commands, '');
  assert.equal(JSON.stringify(commands.map((c) => c.id)), before);
  assert.equal(commands[0].score, undefined); // scores live on the copies
});

// ---- matchesCombo -------------------------------------------------------

const key = (k, extra = {}) => ({ key: k, ...extra });

test('"mod" means Ctrl or Cmd, and nothing else does', () => {
  assert.equal(matchesCombo('mod+k', key('k', { ctrlKey: true })), true);
  assert.equal(matchesCombo('mod+k', key('k', { metaKey: true })), true);
  assert.equal(matchesCombo('mod+k', key('k')), false);
  assert.equal(matchesCombo('mod+k', key('j', { ctrlKey: true })), false);
});

test('an unlisted modifier means it is a different shortcut', () => {
  assert.equal(matchesCombo('mod+k', key('k', { ctrlKey: true, shiftKey: true })), false);
  assert.equal(matchesCombo('mod+shift+k', key('K', { ctrlKey: true, shiftKey: true })), true);
});

test('bare keys need no modifiers at all', () => {
  assert.equal(matchesCombo('escape', key('Escape')), true);
  assert.equal(matchesCombo('escape', key('Escape', { ctrlKey: true })), false);
  assert.equal(matchesCombo('arrowdown', key('ArrowDown')), true);
  assert.equal(matchesCombo('enter', key('Enter')), true);
});

// ---- the registry itself ------------------------------------------------

test('every command is complete and uniquely identified', () => {
  const ids = commands.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate command id');
  for (const cmd of commands) {
    assert.ok(cmd.title, `${cmd.id} needs a title`);
    assert.equal(typeof cmd.run, 'function', `${cmd.id} needs a run`);
  }
});

test('what a command DOES is testable too — that is the point of the registry', () => {
  const calls = [];
  const actions = {
    toggleTheme: () => calls.push('toggleTheme'),
    setFontSize: (fn) => calls.push(['setFontSize', fn(16)]),
    log: (text) => calls.push(['log', text]),
    clearLog: () => calls.push('clearLog'),
  };
  const run = (id) => commands.find((c) => c.id === id).run(actions);

  run('theme.toggle');
  run('font.increase');
  run('font.decrease');
  run('font.reset');
  run('log.hello');
  run('log.clear');

  assert.deepEqual(calls, [
    'toggleTheme',
    ['setFontSize', 18],
    ['setFontSize', 14],
    ['setFontSize', 16],
    ['log', 'hello 👋'],
    'clearLog',
  ]);
});

test('the font commands refuse to leave the readable range', () => {
  let size = null;
  const actions = { setFontSize: (fn) => { size = fn(32); } };
  commands.find((c) => c.id === 'font.increase').run(actions);
  assert.equal(size, 32, 'cannot grow past 32');

  actions.setFontSize = (fn) => { size = fn(10); };
  commands.find((c) => c.id === 'font.decrease').run(actions);
  assert.equal(size, 10, 'cannot shrink past 10');
});
