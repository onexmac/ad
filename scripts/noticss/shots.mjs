/**
 * Noticss: a photo for each storyline, and for the notes that have their own.
 *
 * The photo is the one the source page offers for sharing (og:image or
 * twitter:image), credited to the outlet. It is linked, not copied: the
 * repository is public and editions arrive twice a day, so copying every
 * outlet's photos would make it grow without end and republish them. Each
 * link is checked to answer with an image before it is kept; a storyline
 * without one goes without a photo.
 */

const UA = "Mozilla/5.0 (compatible; Noticss/1.0; +https://magi0s.vercel.app/kit/noticss)";

async function get(url, init = {}) {
  return fetch(url, { redirect: "follow", signal: AbortSignal.timeout(12000), headers: { "user-agent": UA, ...(init.headers || {}) }, ...init });
}

const META = /<meta\s[^>]*>/gi;
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[2] ?? m[3]) : null;
};
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&#47;/g, "/");

/** The share image a page declares, as an absolute URL, or null. */
export async function shareImage(pageUrl) {
  try {
    const res = await get(pageUrl, { headers: { accept: "text/html" } });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 400_000);
    let found = null;
    for (const tag of html.match(META) ?? []) {
      const key = (attr(tag, "property") || attr(tag, "name") || "").toLowerCase();
      const content = attr(tag, "content");
      if (!content) continue;
      if (key === "og:image" || key === "og:image:secure_url") {
        found = content;
        break;
      }
      if (!found && (key === "twitter:image" || key === "twitter:image:src")) found = content;
    }
    if (!found) return null;
    const abs = new URL(decode(found.trim()), res.url || pageUrl).href;
    if (!abs.startsWith("https://")) return null;
    return (await isImage(abs)) ? abs : null;
  } catch {
    return null;
  }
}

async function isImage(url) {
  try {
    let res = await get(url, { method: "HEAD" });
    if (!res.ok || !res.headers.get("content-type")) res = await get(url, { headers: { range: "bytes=0-1023" } });
    const type = res.headers.get("content-type") || "";
    return (res.ok || res.status === 206) && type.startsWith("image/") && !type.includes("svg");
  } catch {
    return false;
  }
}

/** Runs `fn` over `items`, `n` at a time. */
async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

const picture = (url, alt, outlet) => ({ url, color: url, alt, credit: outlet || null });

/**
 * Fills `image` on every storyline (from the first of its notes whose page has
 * one) and on the notes whose own page shows a different photo.
 */
export async function attachShots(subjects) {
  const pages = new Map();
  for (const s of subjects) for (const n of s.snippets) if (n.source.url) pages.set(n.source.url, null);
  const urls = [...pages.keys()];
  const images = await pool(urls, 6, shareImage);
  // A site's default share card (its logo on a colour) is not a photo: drop an
  // image that three or more pages share, or whose name says what it is.
  const uses = new Map();
  for (const im of images) if (im) uses.set(im, (uses.get(im) ?? 0) + 1);
  const generic = (im) => !im || uses.get(im) >= 3 || /logo|favicon|placeholder|default[-_]?(share|image|og)|\/shares?\//i.test(im);
  urls.forEach((u, i) => pages.set(u, generic(images[i]) ? null : images[i]));
  let found = 0;
  const out = subjects.map((s) => {
    const own = s.snippets.find((n) => n.source.url && pages.get(n.source.url));
    const lead = own ? picture(pages.get(own.source.url), s.title, own.source.name) : null;
    if (lead) found++;
    return {
      ...s,
      image: s.image ?? lead,
      snippets: s.snippets.map((n) => {
        const img = n.source.url ? pages.get(n.source.url) : null;
        return { ...n, image: n.image ?? (img && img !== lead?.url ? picture(img, n.headline, n.source.name) : null) };
      }),
    };
  });
  console.log(`photos: ${found} of ${subjects.length} storylines, ${urls.length} pages read`);
  return out;
}
