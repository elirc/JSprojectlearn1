import { FONT, FONT_HEIGHT } from './font.js';

/**
 * The rendering pipeline, one stage per function:
 *
 *   Date -> formatTime -> "14:03:59" -> renderText -> big ASCII string
 *
 * Both stages are pure: no console, no timers, no current time.
 * That's what makes them testable (see render.test.js).
 */

export function formatTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Render any FONT-supported string as multi-row ASCII art. */
export function renderText(text) {
  for (const char of text) {
    if (!(char in FONT)) throw new Error(`No glyph for "${char}"`);
  }

  // Row by row: take row r of every character's glyph, join with a gap.
  const rows = [];
  for (let r = 0; r < FONT_HEIGHT; r++) {
    rows.push([...text].map((char) => FONT[char][r]).join(' '));
  }
  return rows.join('\n');
}
