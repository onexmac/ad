import registry from "./apps.json";

export type PortalApp = {
  /** Path segment: the app lives at /<section>/<slug>. */
  slug: string;
  name: string;
  description?: string;
  /**
   * Set while the app still lives in its own deployment. The portal path
   * redirects there. Remove it once the app's code is moved into
   * app/<section>/<slug>/ in this repo.
   */
  external?: string;
  /** A folder: its apps live at /<section>/<slug>/<child>, listed on its own index. */
  apps?: PortalApp[];
  /** Where its code is: a path in this repo (its route folder), or a full URL for an app still elsewhere. */
  code?: string;
};

/** This repo on GitHub (public). */
export const REPO = "https://github.com/onexmac/ad";

/** The page on GitHub with an app's code: its folder on main, or the repo itself for an entry with none. */
export function codeUrl(app: PortalApp): string {
  if (!app.code) return REPO;
  return /^https?:/.test(app.code) ? app.code : `${REPO}/tree/main/${app.code}`;
}

export type PortalSection = {
  slug: string;
  name: string;
  tagline: string;
  apps: PortalApp[];
};

export const sections = registry.sections as PortalSection[];

export function getSection(slug: string): PortalSection {
  const section = sections.find((s) => s.slug === slug);
  if (!section) throw new Error(`Unknown portal section: ${slug}`);
  return section;
}

/** A folder inside a section, e.g. AD › Pads. */
export function getFolder(section: string, slug: string): PortalApp & { apps: PortalApp[] } {
  const folder = getSection(section).apps.find((a) => a.slug === slug);
  if (!folder?.apps) throw new Error(`Unknown portal folder: ${section}/${slug}`);
  return folder as PortalApp & { apps: PortalApp[] };
}

/** Apps under a list, counting what is inside folders rather than the folders. */
export function countApps(apps: PortalApp[]): number {
  return apps.reduce((n, a) => n + (a.apps ? countApps(a.apps) : 1), 0);
}
