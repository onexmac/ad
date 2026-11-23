// Axis Cube keeps itself on the device: the page with its loading screen, its styles and scripts, and the room's
// photographs. Opened from the home screen it starts from here, without waiting for the network.
//
// This file sits beside the app's folder, not inside it, so that its scope can be "/kit/axis-cube": the app's own
// address has no trailing slash and a worker inside the folder could not cover it. It answers nothing else on the site.
const CACHE = "axis-cube-1";
const HOME = "/kit/axis-cube";
const WAIT = 500;   // how long the page is asked of the network before the kept copy is shown instead

const ours = (path) => path === HOME || path.startsWith(HOME + "/");
const built = (path) => path.startsWith("/_next/static/");
const keepable = (res) => res && res.ok && res.type === "basic";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// The page: the network if it answers within half a second, so a new version shows the first time it is opened;
// otherwise the kept copy at once, and the answer is kept for next time when it comes.
async function page(e, path) {
  const cache = await caches.open(CACHE);
  const kept = await cache.match(path, { ignoreVary: true });
  const fresh = fetch(e.request).then((res) => {
    if (keepable(res)) e.waitUntil(cache.put(path, res.clone()));
    return res;
  });
  if (!kept) return fresh;
  const late = new Promise((done) => setTimeout(() => done(null), WAIT));
  const first = await Promise.race([fresh.catch(() => null), late]);
  if (first && keepable(first)) return first;
  e.waitUntil(fresh.catch(() => {}));
  return kept;
}

// Built files never change under the same name: the kept copy, always. The room's own files keep their names when
// they change, so the kept copy is shown and a new one is fetched behind it.
async function file(e, path) {
  const cache = await caches.open(CACHE);
  const kept = await cache.match(path, { ignoreVary: true });
  if (kept && built(path)) return kept;
  const fresh = fetch(e.request).then((res) => {
    if (keepable(res)) e.waitUntil(cache.put(path, res.clone()));
    return res;
  });
  if (!kept) return fresh;
  e.waitUntil(fresh.catch(() => {}));
  return kept;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.search) return;
  if (req.mode === "navigate") {
    if (ours(url.pathname)) e.respondWith(page(e, url.pathname));
    return;
  }
  if (built(url.pathname) || ours(url.pathname)) e.respondWith(file(e, url.pathname));
});

// When the room is on screen the page says what it loaded. Whatever of that is not kept yet is fetched now (the first
// visit happens before this worker is in charge), and built files from older versions are let go.
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type !== "keep" || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const want = new Set();
    for (const u of d.urls) {
      try {
        const url = new URL(u, self.location.origin);
        if (url.origin === self.location.origin && !url.search && (built(url.pathname) || ours(url.pathname))) want.add(url.pathname);
      } catch (err) { /* not an address */ }
    }
    if (!want.size) return;
    const cache = await caches.open(CACHE);
    for (const path of want) {
      if (await cache.match(path, { ignoreVary: true })) continue;
      try { const res = await fetch(path); if (keepable(res)) await cache.put(path, res); } catch (err) { /* offline: next time */ }
    }
    for (const req of await cache.keys()) {
      const path = new URL(req.url).pathname;
      if (built(path) && !want.has(path)) await cache.delete(req);
    }
  })());
});
