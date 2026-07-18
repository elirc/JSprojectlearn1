// A config loader where failures are "handled" with the classic
// mixed-convention kit js#30 catalogued — except here the types
// actively HELP callers forget the failure cases.

export interface AppConfig {
  port: number;
  host: string;
}

// convention 1: null means... malformed? missing? who knows
export function loadConfigFile(path: string): string | null {
  if (path === '/etc/app.json') return '{"port": 8080, "host": "0.0.0.0"}';
  if (path === '/etc/broken.json') return '{"port": }';
  return null;
}

// convention 2: throws for parse errors (fine!) but the SIGNATURE
// doesn't say so — TypeScript has no `throws`, so callers can't see
// that this function is a grenade:
export function parseConfig(json: string): AppConfig {
  return JSON.parse(json) as AppConfig; // (also ts#13's laundering, again)
}

// convention 3: a fallback that hides everything:
export function getConfig(path: string): AppConfig {
  try {
    const raw = loadConfigFile(path);
    return parseConfig(raw!); // ! on a null — ts#05's lie
  } catch {
    return { port: 3000, host: 'localhost' }; // any failure -> defaults
  }
}

// The caller experience: this compiles, runs, and quietly serves
// DEFAULTS when the real config is broken —
export const config = getConfig('/etc/broken.json');
// { port: 3000, host: 'localhost' } — the ops team configured 8080;
// the app is on 3000; the "why" (malformed file? missing file? typo'd
// path?) was eaten by the catch. Nothing in any signature warned
// anyone that failure was possible, let alone what KIND.
