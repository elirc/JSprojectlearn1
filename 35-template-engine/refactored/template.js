/**
 * A mustache-style template engine in ~30 lines.
 *
 *   {{ path }}    -> insert data, HTML-ESCAPED (the safe default)
 *   {{{ path }}}  -> insert raw HTML (opt-in, for trusted content only)
 *
 * Paths reach into nested objects: {{ user.name }}.
 * Missing values render as '' rather than 'undefined'.
 */

/** The five characters that let text break out of HTML, neutralized. */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;') // & first, or it double-escapes the others
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** lookup({user: {name: 'Ada'}}, 'user.name') -> 'Ada' */
export function lookup(data, path) {
  return path.split('.').reduce((value, key) => value?.[key], data);
}

export function render(template, data) {
  return template
    // Triple-brace first, so double-brace can't half-match it.
    // replace(REGEX with /g, fn): every occurrence, and the callback
    // sidesteps the $-substitution rules entirely.
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g,
      (_, path) => String(lookup(data, path) ?? ''))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g,
      (_, path) => escapeHtml(lookup(data, path) ?? ''));
}
