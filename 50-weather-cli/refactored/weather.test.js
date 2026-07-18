import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWeather, formatReport, ConfigError, ApiError } from './weather.js';

/** A fake fetch: records the URL it was called with, returns a canned response. */
function fakeFetch({ status = 200, body = {} } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
  return { fn, calls };
}

const manila = { city: 'Manila', tempC: 31, condition: 'humid', windKph: 12 };

test('happy path: returns the parsed payload', async () => {
  const { fn } = fakeFetch({ body: manila });
  const data = await getWeather('Manila', { apiKey: 'k', fetchFn: fn });
  assert.deepEqual(data, manila);
});

test('the city is URL-encoded ("San Juan" stays one parameter)', async () => {
  const { fn, calls } = fakeFetch({ body: manila });
  await getWeather('San Juan', { apiKey: 'k', fetchFn: fn });
  assert.match(calls[0], /city=San\+Juan/);
});

test('missing city -> ConfigError with usage, no network call', async () => {
  const { fn, calls } = fakeFetch();
  await assert.rejects(
    () => getWeather(undefined, { apiKey: 'k', fetchFn: fn }),
    (e) => e instanceof ConfigError && /Usage/.test(e.message),
  );
  assert.equal(calls.length, 0);
});

test('missing API key -> ConfigError naming the env var', async () => {
  await assert.rejects(
    () => getWeather('Manila', { fetchFn: fakeFetch().fn }),
    (e) => e instanceof ConfigError && /WEATHER_API_KEY/.test(e.message),
  );
});

test('404 becomes a typed "no such city" error, not a later crash', async () => {
  const { fn } = fakeFetch({ status: 404 });
  await assert.rejects(
    () => getWeather('Atlantis', { apiKey: 'k', fetchFn: fn }),
    (e) => e instanceof ApiError && e.status === 404 && /Atlantis/.test(e.message),
  );
});

test('401 becomes a "key rejected" error', async () => {
  const { fn } = fakeFetch({ status: 401 });
  await assert.rejects(
    () => getWeather('Manila', { apiKey: 'bad', fetchFn: fn }),
    (e) => e instanceof ApiError && e.status === 401,
  );
});

test('formatReport is pure and testable (the original could not do this)', () => {
  assert.equal(
    formatReport(manila),
    'Weather for Manila\n  31°C, humid, wind 12 kph',
  );
});

test('formatReport omits wind when calm', () => {
  assert.equal(
    formatReport({ city: 'X', tempC: 20, condition: 'clear', windKph: 0 }),
    'Weather for X\n  20°C, clear',
  );
});
