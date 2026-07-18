// same vendored library, unchanged (see ../../vendor/legacy-slugify.js)
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
