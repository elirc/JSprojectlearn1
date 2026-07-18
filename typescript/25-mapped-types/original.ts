// The team uses Partial/Pick daily (ts#24) but treats them as magic —
// so when they need variations the stdlib DOESN'T ship, they're back
// to hand-copying. Two real examples:

export interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: boolean;
}

// Need: "the same settings, but every field is a getter function"
// (for a lazy config system). Hand-written:
export interface SettingsGetters {
  theme: () => 'light' | 'dark';
  fontSize: () => number;
  notifications: () => boolean;
  // add a field to Settings -> remember to add the getter here.
  // ts#24's rot, back again, because no stdlib type says "wrap every
  // value in () => ".
}

// Need: "track which fields the user has touched" — booleans per key:
export interface SettingsTouched {
  theme: boolean;
  fontSize: boolean;
  notifications: boolean;
  // a shadow that must be maintained by hand. It's ALREADY one field
  // behind in the real codebase this is based on.
}

// Need: "everything readonly AND optional" — they composed by hand
// instead of composing the utilities:
export interface FrozenDraft {
  readonly theme?: 'light' | 'dark';
  readonly fontSize?: number;
  readonly notifications?: boolean;
}

export const getters: SettingsGetters = {
  theme: () => 'dark',
  fontSize: () => 16,
  notifications: () => true,
};
