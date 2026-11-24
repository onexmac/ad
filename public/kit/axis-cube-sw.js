// The Cubes keeps itself on the device: the page with its loading screen, its styles and scripts, and the room's
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
const got = (cache, key) => cache.match(key, { ignoreVary: true });
// the built files a page names (its styles and scripts)
const named = (html) => Array.from(new Set(html.match(/\/_next\/static\/[^"'\\<>\s)]+/g) || []));

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// When a newer page was kept while an older copy of it was on screen: page address → the moment it happened.
const fresher = new Map();

// A page is kept only once the built files it names are kept too, so what is kept always opens with no network:
// a new page never takes the place of the old one while its scripts are still missing.
// If the older copy is what was shown, the page on screen is told, so it can start over on the new one.
async function keepPage(cache, path, res, old, shownOld) {
  const html = await res.clone().text();
  for (const key of named(html)) {
    if (await got(cache, key)) continue;
    const file = await fetch(key);
    if (!keepable(file)) return;
    await cache.put(key, file);
  }
  await cache.put(path, res);
  if (old === null || old === html || !shownOld()) return;
  fresher.set(path, Date.now());
  for (const client of await self.clients.matchAll({ type: "window" })) {
    if (new URL(client.url).pathname === path) client.postMessage({ type: "fresh", path });
  }
}

// The page: the network if it answers within half a second; otherwise the kept copy at once. When the answer
// comes late and is a newer page, it is kept and the page on screen is told (see keepPage), so a new version
// shows the first time the app is opened either way.
async function page(e, path) {
  const cache = await caches.open(CACHE);
  const kept = await got(cache, path);
  const old = kept ? await kept.clone().text() : null;
  let shownOld = false;
  const fresh = fetch(e.request).then((res) => {
    if (keepable(res)) e.waitUntil(keepPage(cache, path, res.clone(), old, () => shownOld).catch(() => {}));
    return res;
  });
  if (!kept) return fresh;
  const late = new Promise((done) => setTimeout(() => done(null), WAIT));
  const first = await Promise.race([fresh.catch(() => null), late]);
  if (first && keepable(first)) return first;
  shownOld = true;
  e.waitUntil(fresh.catch(() => {}));
  return kept;
}

// Built files never change under the same name: the kept copy, always. The room's own files keep their names when
// they change, so the kept copy is shown and a new one is fetched behind it.
async function file(e, key, fixed) {
  const cache = await caches.open(CACHE);
  const kept = await got(cache, key);
  if (kept && fixed) return kept;
  const fresh = fetch(e.request).then((res) => {
    if (keepable(res)) e.waitUntil(cache.put(key, res.clone()).catch(() => {}));
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
  if (url.origin !== self.location.origin) return;
  if (built(url.pathname)) { e.respondWith(file(e, url.pathname + url.search, true)); return; }
  if (url.search || !ours(url.pathname)) return;
  e.respondWith(req.mode === "navigate" ? page(e, url.pathname) : file(e, url.pathname, false));
});

// When the room is on screen the page says what it loaded. Whatever of that is not kept yet is fetched now (the first
// visit happens before this worker is in charge). Built files that neither this page loaded nor any kept page names
// belong to older versions, and are let go.
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "fresh?") {                             // a page asks whether a newer copy of itself came in since it was opened
    const newer = (fresher.get(d.path) || 0) > (d.since || 0);
    if (e.source) e.source.postMessage({ type: newer ? "fresh" : "same", path: d.path });
    return;
  }
  if (d.type !== "keep" || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const want = new Set();
    for (const u of d.urls) {
      try {
        const url = new URL(u, self.location.origin);
        if (url.origin !== self.location.origin) continue;
        if (built(url.pathname)) want.add(url.pathname + url.search);
        else if (!url.search && ours(url.pathname)) want.add(url.pathname);
      } catch (err) { /* not an address */ }
    }
    if (!want.size) return;
    const cache = await caches.open(CACHE);
    for (const key of want) {
      if (await got(cache, key)) continue;
      try { const res = await fetch(key); if (keepable(res)) await cache.put(key, res); } catch (err) { /* offline: next time */ }
    }
    const keys = await cache.keys();
    for (const req of keys) {                              // every kept page keeps what it names
      const url = new URL(req.url);
      if (built(url.pathname) || /\.[a-z0-9]+$/i.test(url.pathname)) continue;
      const res = await cache.match(req);
      if (res) for (const key of named(await res.text())) want.add(key);
    }
    for (const req of keys) {
      const url = new URL(req.url);
      if (built(url.pathname) && !want.has(url.pathname + url.search)) await cache.delete(req);
    }
  })());
});
