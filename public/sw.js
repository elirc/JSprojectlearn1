/* SkillForge Quest service worker.
 *
 * Goals (see handoff/POLISH-PLAN.md, Stream C):
 *   - the app shell must never go stale after a deploy  -> network-first navigation,
 *     versioned cache names, skipWaiting + clients.claim, old caches deleted on activate.
 *   - a mission opened once must be readable offline    -> cache-first with background
 *     refresh for /content/catalog.json and /content/missions/*.json.
 *   - the mission cache is capped at 60 entries (oldest insertion evicted first).
 *   - GET only. POST/PUT/etc. are never cached and never intercepted.
 *   - nothing here touches localStorage; saved progress stays exactly where it was.
 *
 * Bump CACHE_VERSION whenever the caching behaviour itself changes; the built assets are
 * content-hashed by Vite so normal deploys do not need a bump.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `sfq-shell-${CACHE_VERSION}`;
const CONTENT_CACHE = `sfq-content-${CACHE_VERSION}`;
const EXPECTED_CACHES = new Set([SHELL_CACHE, CONTENT_CACHE]);

/** App shell entries precached on install. Built assets are hashed and cached on demand. */
const SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest"];

/** Max number of /content/missions/*.json responses kept in the content cache. */
const MISSION_CACHE_LIMIT = 60;

const CATALOG_PATH = "/content/catalog.json";
const MISSION_PREFIX = "/content/missions/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, so one 404 cannot fail the whole install.
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            /* offline or missing at install time: it will be filled in on first fetch */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("sfq-") && !EXPECTED_CACHES.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

function isMissionRequest(url) {
  return url.pathname.startsWith(MISSION_PREFIX) && url.pathname.endsWith(".json");
}

function isContentRequest(url) {
  return url.pathname === CATALOG_PATH || isMissionRequest(url);
}

function isHashedAsset(url) {
  return url.pathname.startsWith("/assets/");
}

/** Trim the mission entries of the content cache down to MISSION_CACHE_LIMIT, oldest first. */
async function trimMissionCache(cache) {
  const keys = await cache.keys();
  const missions = keys.filter((request) => {
    try {
      return isMissionRequest(new URL(request.url));
    } catch {
      return false;
    }
  });
  const overflow = missions.length - MISSION_CACHE_LIMIT;
  for (let i = 0; i < overflow; i += 1) {
    await cache.delete(missions[i]);
  }
}

/** Cache-first with background refresh; re-insertion moves an entry to the newest slot. */
async function contentStrategy(event, request, url) {
  const cache = await caches.open(CONTENT_CACHE);
  const cached = await cache.match(request);

  const refresh = fetch(request)
    .then(async (response) => {
      if (response && response.ok && response.status === 200) {
        // delete-then-put so Cache Storage insertion order stays "newest last"
        await cache.delete(request);
        await cache.put(request, response.clone());
        if (isMissionRequest(url)) await trimMissionCache(cache);
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    // Do not let the page wait on the refresh, but keep the SW alive for it.
    event.waitUntil(refresh);
    return cached;
  }
  const network = await refresh;
  if (network) return network;
  return new Response(JSON.stringify({ error: "offline", url: url.pathname }), {
    status: 503,
    statusText: "Offline and not cached",
    headers: { "Content-Type": "application/json" },
  });
}

/** Network-first, falling back to whatever the shell cache holds. */
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.status === 200 && response.type === "basic") {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached =
      (await cache.match(request)) ||
      (fallbackUrl ? await cache.match(fallbackUrl) : undefined);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  // Range requests (media) are left entirely alone.
  if (request.headers.has("range")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/index.html"));
    return;
  }

  if (isContentRequest(url)) {
    event.respondWith(contentStrategy(event, request, url));
    return;
  }

  if (isHashedAsset(url) || url.pathname === "/manifest.webmanifest") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(networkFirst(request));
  }
});
