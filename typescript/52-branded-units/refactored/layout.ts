// ts#29's brand, pointed at physical units. A `Px` IS a number at
// runtime (zero cost, fully erased) but the compiler treats pixels,
// ems and milliseconds as three different species that cannot be
// added, swapped, or formatted with each other's suffix.

// The generic brand helper (ts#29's practice #4, promoted to the file):
export type Brand<T, Name extends string> = T & { readonly __unit: Name };

export type Px = Brand<number, 'px'>;
export type Em = Brand<number, 'em'>;
export type Ms = Brand<number, 'ms'>;

// Every branded number in this file, as one union — the constraint
// that lets generic helpers work on any unit while keeping it:
export type Unit = Px | Em | Ms;

// ---- the doors: one honest cast each ------------------------------
export function px(value: number): Px {
  if (!Number.isFinite(value)) throw new RangeError(`px must be finite, got ${value}`);
  return value as Px;
}
export function em(value: number): Em {
  return value as Em;
}
export function ms(value: number): Ms {
  if (value < 0) throw new RangeError(`durations can't be negative, got ${value}`);
  return value as Ms;
}

// ---- arithmetic that PRESERVES the brand --------------------------
// Raw `a + b` on two Px produces a plain `number` — math strips
// brands. These helpers put the result back through the door, so a
// unit survives a whole calculation instead of leaking at step one.
export function addPx(a: Px, b: Px): Px {
  return px((a as number) + (b as number));
}

export function scale<T extends Unit>(value: T, factor: number): T {
  return ((value as number) * factor) as T; // T in, T out
}

export function sum<T extends Unit>(values: readonly T[]): T {
  return values.reduce<number>((total, value) => total + (value as number), 0) as T;
}

// ---- conversion: the only doors BETWEEN units ---------------------
export function emToPx(size: Em, root: Px): Px {
  return px((size as number) * (root as number)); // the *rootSize, in one place
}
export function pxToEm(size: Px, root: Px): Em {
  return em((size as number) / (root as number));
}
export function secondsToMs(seconds: number): Ms {
  return ms(seconds * 1000);
}

// ---- the API, stating its units -----------------------------------
// Each formatter owns exactly one suffix, and only its own unit can
// reach it — so the suffix can never disagree with the value.
export function card(width: Px, padding: Px, fontSize: Em): string {
  return [`width:${width}px`, `padding:${padding}px`, `font-size:${fontSize}em`].join(';');
}
export function fadeIn(duration: Ms): string {
  return `transition:opacity ${duration}ms`;
}

// ---- usage --------------------------------------------------------
const ROOT = px(16);
const GUTTER = px(16);
const TITLE_SIZE = em(1.5);
const FADE = ms(250);

export const style = card(px(320), GUTTER, TITLE_SIZE);
export const animation = fadeIn(FADE);
export const wide: Px = addPx(GUTTER, px(8)); // 24px
export const double: Em = scale(TITLE_SIZE, 2); // 3em — still an Em
export const stack: Px = sum([GUTTER, px(8), px(4)]); // 28px — still a Px
export const titleInPx: Px = emToPx(TITLE_SIZE, ROOT); // 24px, via the door

// ==== type tests: every original mix-up, now a compile error =======
// @ts-expect-error — the swapped arguments (250ms as a width)
card(FADE, GUTTER, TITLE_SIZE);

// @ts-expect-error — a gutter is not a duration ("the animation isn't working")
fadeIn(GUTTER);

// @ts-expect-error — cross-unit arithmetic: an Em is not a Px
addPx(GUTTER, TITLE_SIZE);

// @ts-expect-error — bare numbers can't sneak in; go through px()
addPx(GUTTER, 8);

// @ts-expect-error — scale preserves the brand: Ms in, Ms out
export const notPx: Px = scale(FADE, 2);

// @ts-expect-error — so does sum: a stack of pixels is not a duration
export const notMs: Ms = sum([GUTTER, px(8)]);

// @ts-expect-error — a mixed-unit list has no single brand to return
export const mixed: Px = sum([GUTTER, TITLE_SIZE]);

// @ts-expect-error — conversion is the ONLY path between units
export const noDoor: Px = TITLE_SIZE;

// @ts-expect-error — and the compiler knows which way round emToPx goes
emToPx(ROOT, TITLE_SIZE);

// (Runtime validity still belongs to the doors: ms(-1) and px(NaN)
// throw. Brand = identity at compile time; door = validity at
// runtime. ts#13's boundary pattern, applied to a single number.)
