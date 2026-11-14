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
};

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
