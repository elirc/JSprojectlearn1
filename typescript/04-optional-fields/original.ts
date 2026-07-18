// A settings object where EVERYTHING is optional, because "users
// might not set it". Compiles fine. Every read is a coin flip.

export interface Settings {
  theme?: string;
  fontSize?: number;
  email?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
  };
}

export function describeSettings(settings: Settings): string {
  // Under strict mode the compiler DOES flag naked access... so the
  // author silenced it the fast way, with ! (the non-null assertion,
  // a promise the compiler takes on faith):
  const size = settings.fontSize! + 2;            // undefined + 2 = NaN
  const emailUpper = settings.email!.toUpperCase(); // CRASH if absent

  // and the nested one got the double-! treatment:
  const wantsPush = settings.notifications!.push!;

  return `${settings.theme ?? 'light'} @ ${size}px, ${emailUpper}, push: ${wantsPush}`;
}

// The deeper modeling problem: `?` was used to mean THREE different
// things, and the type can't tell them apart:
//   theme     — optional with a DEFAULT (absence means 'light')
//   email     — genuinely might not exist (user never gave one)
//   fontSize  — required by the app, but "we'll fill it in later"
// A caller reading this interface learns none of that.

export const partial: Settings = {}; // legal! everything's optional
// describeSettings(partial) crashes at runtime on .toUpperCase() —
// with the compiler's blessing, because every ! said "trust me".
