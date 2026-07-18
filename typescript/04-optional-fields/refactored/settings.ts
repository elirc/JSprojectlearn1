// Model the three DIFFERENT situations `?` was hiding:
//   1. optional-with-default  -> optional at the EDGE, required inside
//   2. genuinely-maybe-absent -> T | undefined, handled at every read
//   3. required               -> just required. no ?.

/** What callers may pass: the lenient EDGE shape. */
export interface SettingsInput {
  theme?: 'light' | 'dark';
  fontSize?: number;
  email?: string; // genuinely optional: a user may have no email
  notifications?: {
    email?: boolean;
    push?: boolean;
  };
}

/** What the app works with INSIDE: defaults applied, no surprises. */
export interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  email: string | undefined; // still maybe-absent — but EXPLICITLY, forever
  notifications: {
    email: boolean;
    push: boolean;
  };
}

/** The edge: one place where defaults are decided (js#30's boundary). */
export function resolveSettings(input: SettingsInput): Settings {
  return {
    theme: input.theme ?? 'light',
    fontSize: input.fontSize ?? 16,
    email: input.email, // no default exists for an email — stays maybe
    notifications: {
      email: input.notifications?.email ?? true,
      push: input.notifications?.push ?? false,
    },
  };
}

export function describeSettings(settings: Settings): string {
  // fontSize/theme/notifications: plain access. No !, no ?., no ?? —
  // the RESOLVED type promises they're there.
  const size = settings.fontSize + 2;

  // email is the one genuine maybe — and the type FORCES the branch:
  const emailPart =
    settings.email === undefined ? 'no email' : settings.email.toUpperCase();

  return `${settings.theme} @ ${size}px, ${emailPart}, push: ${settings.notifications.push}`;
}

export const described = describeSettings(resolveSettings({}));
// works: {} resolves to full defaults, email handled as absent

// ==== type tests ==================================================
declare const resolved: Settings;

// @ts-expect-error — resolved settings can't be built with fields missing
export const bad: Settings = { theme: 'light' };

// @ts-expect-error — email must be checked before use (no ! escape hatch)
export const shout: string = resolved.email.toUpperCase();
