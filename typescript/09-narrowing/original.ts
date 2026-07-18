// A pretty-printer for config values that can be several things.
// The author knows ONE tool for "TypeScript won't let me": `as`.

export function prettyValue(value: string | number | string[] | null): string {
  // "I know it's a string here" — no, you HOPE it's a string here:
  if ((value as string).toUpperCase !== undefined) {
    return (value as string).toUpperCase();
  }
  // "otherwise it's the number" — unless it was the array, or null
  // (null makes the FIRST branch crash: (null).toUpperCase — boom):
  if ((value as number) > 0) {
    return `${(value as number).toFixed(2)}`;
  }
  return (value as string[]).join(', ');
  // prettyValue(null)  -> TypeError at the first cast
  // prettyValue(-5)    -> falls through to join() -> TypeError
  // Every `as` is the compiler asking "how do you know?" and the
  // author answering "I just do". Casts don't CHECK anything —
  // they disable the question.
}

export const shown = [
  prettyValue('hello'),
  prettyValue(3.14159),
  prettyValue(['a', 'b']),
  // prettyValue(null),  // crash
  // prettyValue(-5),    // crash
];
