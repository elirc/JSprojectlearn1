/**
 * The thin I/O shell: argv in, env in, text out, exit code out.
 * It contains no weather logic — just wiring and error PRESENTATION.
 *
 * Run:  WEATHER_API_KEY=... node cli.js Manila
 * (Without a key it exits with the usage message — the point of the
 * demo is the structure; the API host is fictional.)
 */
import { getWeather, formatReport, ConfigError, ApiError } from './weather.js';

const city = process.argv[2];

try {
  const data = await getWeather(city, {
    apiKey: process.env.WEATHER_API_KEY, // env, not source code
  });
  console.log(formatReport(data));
} catch (err) {
  // One catch at the boundary (project 30), with per-type advice:
  if (err instanceof ConfigError) {
    console.error(err.message);
    process.exitCode = 2; // misuse
  } else if (err instanceof ApiError) {
    console.error(err.message);
    process.exitCode = 1;
  } else {
    console.error(`Network problem: ${err.message} — check your connection.`);
    process.exitCode = 1;
  }
}
