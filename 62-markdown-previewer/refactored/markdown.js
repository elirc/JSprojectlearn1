/**
 * A small markdown renderer built the safe way:
 *
 *   RULE 0: escape EVERYTHING first. Every < > & " ' in the source
 *   is neutralized before any markdown processing. The only tags in
 *   the output are tags WE generated. XSS isn't filtered out — it's
 *   structurally impossible to let in. (Project 35, promoted from
 *   lesson to architecture.)
 *
 * Then two passes, like a real renderer (and like project 49):
 *   - BLOCK pass: group lines into paragraphs, headings, lists,
 *     fenced code blocks
 *   - INLINE pass: code spans, bold, italic, links — inside block
 *     text only (a heading mid-paragraph stays literal text)
 *
 * Supported: # headings, - lists, ``` fences, paragraphs, `code`,
 * **bold**, *italic*, [links](url). Enough to feel real; small
 * enough to read whole.
 */

export function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (ch) => map[ch]);
}

// Code-span placeholders are wrapped in the NUL character: it can't
// be typed and can't come out of escaping, so a placeholder can never
// collide with real content (a bare "0" in the text could).
const NUL = String.fromCharCode(0);
const PLACEHOLDER_RE = new RegExp(`${NUL}(\\d+)${NUL}`, 'g');

/**
 * Inline formatting. Order is not folklore here — it's explicit
 * design, commented:
 *   1. code spans FIRST, pulled out as placeholders, so nothing
 *      inside backticks is ever formatted (`*x*` stays literal)
 *   2. bold before italic, so ** isn't eaten as two *
 *   3. links last, with the URL vetted
 */
export function renderInline(text) {
  const codeSpans = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(`<code>${code}</code>`);
    return NUL + (codeSpans.length - 1) + NUL;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, url) =>
    isSafeUrl(url) ? `<a href="${url}">${label}</a>` : whole);

  return out.replace(PLACEHOLDER_RE, (_, i) => codeSpans[i]);
}

/**
 * Allowlist, not blocklist: http(s), mailto, and relative paths.
 * "javascript:" never gets a chance — and neither do the schemes
 * nobody has thought of yet. (NB: the url was already HTML-escaped,
 * but escaping doesn't make a javascript: URL safe — this check is
 * about the SCHEME, a different threat than markup injection.)
 */
export function isSafeUrl(url) {
  return /^(https?:|mailto:|\/|\.\/|#)/i.test(url);
}

export function markdownToHtml(source) {
  const lines = escapeHtml(source).split('\n'); // RULE 0, applied once, up front
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    // ``` fenced code: literal lines until the closing fence
    if (line.startsWith('```')) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++; // the closing fence
      blocks.push(`<pre><code>${code.join('\n')}</code></pre>`); // NO inline pass: code is literal
      continue;
    }

    // # heading — only at line START, because the block pass owns
    // line context (the original matched headings anywhere)
    const heading = line.match(/^(#{1,6}) (.*)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // - list: consecutive list lines form ONE <ul>
    if (line.match(/^- /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^- /)) {
        items.push(`<li>${renderInline(lines[i].slice(2))}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // paragraph: consecutive plain lines until a blank or block start
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !lines[i].match(/^(#{1,6}) /) &&
      !lines[i].match(/^- /)
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(`<p>${renderInline(para.join(' '))}</p>`);
  }

  return blocks.join('\n');
}
