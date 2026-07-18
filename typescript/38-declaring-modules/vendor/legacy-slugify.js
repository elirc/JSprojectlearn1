// "legacy-slugify" — the venerable untyped library. Do not modify;
// upstream hasn't accepted a PR since 2019.
export default function slugify(text, options) {
  const separator = (options && options.separator) || '-';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');
}

export function isSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}
