/**
 * The logic layer of the weather CLI — everything here is testable
 * without a network, because the ONE side-effecting thing (fetch)
 * is injected.
 *
 * Layering:  getWeather (network, injected fetch)
 *            formatReport (pure: data -> string)
 *            cli.js glues them to argv/env/console
 */

/**
 * Typed errors (project 30's lesson): the caller can tell "your wifi
 * is down" apart from "no such city" and print different advice.
 */
export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const BASE_URL = 'https://api.example-weather.test/v1/current';

/**
 * Fetch current weather for a city.
 *
 * - `apiKey` is a parameter — reading process.env is the CLI's job,
 *   not the library's. (And the key is NEVER a string literal in
 *   this repo; git history is forever.)
 * - `fetchFn` is injectable so tests run offline and instantly.
 * - fetch only rejects on network failure; HTTP errors like 404 come
 *   back as perfectly successful responses with res.ok === false.
 *   We turn them into typed throws HERE, at the boundary, so nothing
 *   downstream ever sees a half-valid payload.
 */
export async function getWeather(city, { apiKey, fetchFn = fetch } = {}) {
  if (!city || !city.trim()) {
    throw new ConfigError('No city given. Usage: weather <city>');
  }
  if (!apiKey) {
    throw new ConfigError(
      'Missing API key. Set the WEATHER_API_KEY environment variable.',
    );
  }

  // URLSearchParams encodes for us: "San Juan" -> "San+Juan".
  const params = new URLSearchParams({ city: city.trim(), key: apiKey });
  const res = await fetchFn(`${BASE_URL}?${params}`);

  if (res.status === 404) throw new ApiError(404, `No such city: "${city}"`);
  if (res.status === 401) throw new ApiError(401, 'API key was rejected.');
  if (!res.ok) throw new ApiError(res.status, `Weather API failed (HTTP ${res.status})`);

  return res.json();
}

/** Pure: weather data -> printable string. Trivial to test, so it is tested. */
export function formatReport(data) {
  const wind = data.windKph > 0 ? `, wind ${data.windKph} kph` : '';
  return `Weather for ${data.city}\n  ${data.tempC}°C, ${data.condition}${wind}`;
}
