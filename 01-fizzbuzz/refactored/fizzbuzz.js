// The RULES live here. This file never prints anything — it only decides.

export function fizzbuzz(n) {
  const parts = [];
  if (n % 3 === 0) parts.push('Fizz');
  if (n % 5 === 0) parts.push('Buzz');
  return parts.length > 0 ? parts.join('') : String(n);
}

export function fizzbuzzRange(start, end) {
  const lines = [];
  for (let n = start; n <= end; n++) {
    lines.push(fizzbuzz(n));
  }
  return lines;
}
