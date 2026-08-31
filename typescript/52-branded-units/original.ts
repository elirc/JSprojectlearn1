// A layout engine. Three physical units live in this file — pixels,
// ems, milliseconds — and all three are typed `number`. ts#29 taught
// this lesson with money; here it's CSS, where the compiler's silence
// renders as garbage instead of crashing.

export function card(width: number, padding: number, fontSize: number): string {
  return [
    `width:${width}px`,
    `padding:${padding}px`,
    `font-size:${fontSize}em`, // note: a DIFFERENT suffix, same `number`
  ].join(';');
}

export function fadeIn(duration: number): string {
  return `transition:opacity ${duration}ms`;
}

const GUTTER = 16; // px
const TITLE_SIZE = 1.5; // em
const FADE = 250; // ms

// The three constants are interchangeable to the compiler. Every one
// of these calls typechecks:
export const style = card(FADE, TITLE_SIZE, GUTTER);
//                        ^ms   ^em         ^px
// "width:250px;padding:1.5px;font-size:16em" — a card 250 pixels wide
// (that was meant to be a quarter-second fade), padding of one and a
// half pixels, and a title sixteen times the body size that pushes
// the layout off the screen. It RENDERS. Nothing throws. QA files it
// as "styling looks weird on the pricing page".

// Arithmetic mixes units just as freely:
export const combined = GUTTER + TITLE_SIZE;
// 17.5. Seventeen and a half of what? The number has no answer and
// the type has no opinion.

export function scaleAll(values: number[], factor: number): number[] {
  return values.map((value) => value * factor);
}
export const scaled = scaleAll([GUTTER, TITLE_SIZE, FADE], 2);
// [32, 3, 500] — one array, three units, doubled together. Whatever
// comes out is `number[]`, so it can be spent anywhere.

// And the unit SUFFIX is applied by whoever formats last, far from
// whoever chose the value:
export const animation = fadeIn(GUTTER);
// "transition:opacity 16ms" — a 16-pixel gutter used as a duration.
// The fade is now imperceptible, which reads as "the animation isn't
// working" rather than "someone passed the wrong constant".

// js#32's insight, one domain over: these aren't numbers, they're
// QUANTITIES — a magnitude plus a unit. Drop the unit and every
// mix-up compiles.
