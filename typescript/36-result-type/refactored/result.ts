// Result<T, E>: failure as a VALUE in the signature — a discriminated
// union (ts#10) with exactly two variants. Callers must narrow before
// touching the value, so forgetting the failure case doesn't compile.

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// The failure VOCABULARY for this domain — a union, not a string
// (so handlers can switch exhaustively, ts#12):
export type ConfigError =
  | { kind: 'file-missing'; path: string }
  | { kind: 'malformed-json'; path: string; detail: string }
  | { kind: 'invalid-shape'; path: string };

export interface AppConfig {
  port: number;
  host: string;
}

function loadConfigFile(path: string): string | null {
  if (path === '/etc/app.json') return '{"port": 8080, "host": "0.0.0.0"}';
  if (path === '/etc/broken.json') return '{"port": }';
  return null;
}

function isAppConfig(value: unknown): value is AppConfig {
  return (
    typeof value === 'object' && value !== null &&
    typeof (value as Record<string, unknown>).port === 'number' &&
    typeof (value as Record<string, unknown>).host === 'string'
  );
}

// The signature now TELLS THE WHOLE STORY: you get a config or one
// of three named failures. No throws to forget, no null to !, no
// silent defaults:
export function getConfig(path: string): Result<AppConfig, ConfigError> {
  const raw = loadConfigFile(path);
  if (raw === null) return err({ kind: 'file-missing', path });

  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch (cause) {
    return err({ kind: 'malformed-json', path, detail: String(cause) });
  }

  if (!isAppConfig(data)) return err({ kind: 'invalid-shape', path });
  return ok(data);
}

// The caller MUST face both arms — and can give each failure its own
// response (the "why" the original's catch was eating):
export function startupReport(path: string): string {
  const result = getConfig(path);
  if (!result.ok) {
    switch (result.error.kind) {
      case 'file-missing':
        return `no config at ${result.error.path} — refusing to guess`;
      case 'malformed-json':
        return `config at ${result.error.path} is broken: ${result.error.detail}`;
      case 'invalid-shape':
        return `config at ${result.error.path} is missing required fields`;
    }
  }
  return `starting on ${result.value.host}:${result.value.port}`;
}

export const good = startupReport('/etc/app.json');   // starts on 0.0.0.0:8080
export const broken = startupReport('/etc/broken.json'); // names the REAL problem

// ==== type tests ==================================================
declare const result: Result<AppConfig, ConfigError>;

// @ts-expect-error — no .value until you've checked .ok (ts#10's guarantee)
export const grab = result.value;

// @ts-expect-error — no .error on the success arm either
export const grabErr = result.ok ? result.error : null;

// (When to still THROW — js#30 stands: bugs and unrecoverable states
// throw; EXPECTED, caller-actionable failures — parse errors, not-
// found, validation — are Results. Two tools, two jobs.)
