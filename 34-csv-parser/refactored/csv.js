/**
 * A real CSV parser: one pass, character by character, with one
 * boolean of memory — "am I inside quotes?".
 *
 * That's the insight split() lacks: the meaning of , and \n DEPENDS
 * on quote state. A parser is just a loop that remembers.
 *
 * Handles: quoted fields, commas/newlines inside quotes, "" escapes,
 * \r\n line endings, trailing newline.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // "" -> literal "
        else inQuotes = false;                          // closing quote
      } else {
        field += char; // inside quotes, commas and newlines are just text
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++; // \r\n is ONE ending
      endRow();
    } else {
      field += char;
    }
  }

  // Whatever remains after the last newline is the final row.
  if (field !== '' || row.length > 0) endRow();

  return rows;
}

/** Rows -> objects, using the first row as headers. */
export function csvToObjects(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  return rows.map((row) =>
    Object.fromEntries(header.map((name, i) => [name, row[i] ?? ''])),
  );
}
