// `as const`: "keep this value EXACTLY as written" — literal types,
// readonly everything, tuples stay tuples. The one `as` that never
// lies (it narrows instead of overruling — ts#14's blessed exception).

export const config = {
  env: 'production',
  port: 443,
  retries: 3,
} as const;
// hover config: { readonly env: 'production'; readonly port: 443;
// readonly retries: 3 } — every value kept at full precision.

export function connect(env: 'production' | 'staging', port: number): string {
  return `${env}:${port}`;
}

export const conn = connect(config.env, config.port);
// no casts: config.env IS the literal 'production'.

// Tuples survive:
export const origin = [0, 0] as const; // readonly [0, 0]

export function drawAt(point: readonly [number, number]): string {
  return `(${point[0]}, ${point[1]})`;
}

export const drawn = drawAt(origin); // length & order known — no cast

// Constant lists become genuinely constant, and power derived types
// (the ts#07 idiom's other half):
export const SUPPORTED_LOCALES = ['en', 'de', 'fr'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number]; // 'en' | 'de' | 'fr'

export function greet(locale: Locale): string {
  const greetings = { en: 'hello', de: 'hallo', fr: 'bonjour' } as const;
  return greetings[locale];
}

// WHY widening exists (so the default makes sense): for MUTABLE
// bindings it's what you want — `let mode = 'dark'` should accept
// 'light' later, so it widens to string. Widening is right for
// variables; `as const` is right for VALUES-AS-FACTS.

// ==== type tests ==================================================
// @ts-expect-error — as const made the list readonly: no more klingon
SUPPORTED_LOCALES.push('klingon');

// @ts-expect-error — config is readonly too
config.port = 80;

// @ts-expect-error — Locale is exactly the three: derived, not declared
export const bad: Locale = 'klingon';

declare const widened: string;
// @ts-expect-error — plain strings still don't fit literal slots (no regression)
connect(widened, 443);
