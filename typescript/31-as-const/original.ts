// Config objects and tuples, quietly WIDENED — the compiler forgot
// the exact values the author wrote, keeping only their kinds.

// Widening in action:
export const config = {
  env: 'production',   // typed string, not 'production'
  port: 443,           // typed number, not 443
  retries: 3,
};

// The consequence — functions with literal-union params reject
// values that ARE literally correct:
export function connect(env: 'production' | 'staging', port: number): string {
  return `${env}:${port}`;
}

// connect(config.env, config.port);
// ^ ERROR: string is not assignable to 'production' | 'staging'.
// The author's fix, seen in a thousand codebases:
export const conn = connect(config.env as 'production', config.port);
// A cast (ts#14!) to re-assert what the compiler KNEW two lines ago
// and threw away.

// Tuples widen into arrays:
export const origin = [0, 0]; // number[] — length forgotten, order forgotten

export function drawAt(point: [number, number]): string {
  return `(${point[0]}, ${point[1]})`;
}
// drawAt(origin); // ERROR: number[] is not [number, number]
export const drawn = drawAt(origin as [number, number]); // cast #2

// And mutable "constants" invite mutation:
export const SUPPORTED_LOCALES = ['en', 'de', 'fr']; // string[]
SUPPORTED_LOCALES.push('klingon'); // sure, why not — it's mutable

// The pattern: write exact values, get vague types, cast your way
// back to what you started with.
