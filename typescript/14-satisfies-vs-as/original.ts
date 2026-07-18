// A theme config and a route table — both "typed" with `as`, which
// doesn't check a type so much as OVERRULE one.

interface Theme {
  primary: string;
  background: string;
  text: string;
}

// Attempt 1: `as` to "type" a config object.
export const theme = {
  primary: '#3366cc',
  background: '#ffffff',
  // text is MISSING — but `as Theme` says "trust me" and the
  // compiler obliges. theme.text is typed string, is undefined:
} as Theme;

export const textColor: string = theme.text; // undefined, typed string

// Attempt 2: `as` also silences EXCESS junk:
export const theme2 = {
  primary: '#3366cc',
  background: '#fff',
  text: '#111',
  primry: '#ff0000', // typo'd override that will never apply —
} as Theme;          // `as` waves it through without a word

// Attempt 3: the annotation alternative loses information.
// Annotating widens every value to the interface's types:
const routes: Record<string, string> = {
  home: '/',
  about: '/about',
  admin: '/admin',
};
// routes is now Record<string, string> — the compiler forgot WHICH
// keys exist. So this typo compiles:
export const adminPath = routes.amdin; // undefined, typed string

// The dilemma the author faced:
//   annotate -> checked, but keys/values widen (lost precision)
//   as       -> precision kept, but NOTHING is checked
// They chose `as`. There's a third option they didn't know about.
