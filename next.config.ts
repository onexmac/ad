import type { NextConfig } from "next";
import registry from "./lib/apps.json";

type RegistryApp = { slug: string; external?: string; apps?: RegistryApp[] };

// Apps that still live in their own deployment are reachable at their portal
// path through a temporary redirect, so the shared link never has to change
// when the app's code later moves into this repo.
const externalRedirects = registry.sections.flatMap((section) =>
  (section.apps as RegistryApp[])
    .flatMap((app) =>
      app.apps
        ? app.apps.map((child) => ({ ...child, slug: `${app.slug}/${child.slug}` }))
        : [app],
    )
    .filter((app) => app.external)
    .map((app) => ({
      source: `/${section.slug}/${app.slug}`,
      destination: app.external as string,
      permanent: false,
    })),
);

// Old portal paths of apps that moved. The pads lived in a Pads folder (/ad/pads/<pad>); they are AD apps now.
const movedRedirects = [
  { source: "/ad/pads", destination: "/ad", permanent: false },
  { source: "/ad/pads/:slug", destination: "/ad/:slug", permanent: false },
  // The mixer was PS2 Fiori (/kit/ps2-fiori) until 0.2.1; it is MAQ02 now.
  { source: "/kit/ps2-fiori", destination: "/kit/maq02", permanent: false },
  { source: "/kit/ps2-fiori/:path*", destination: "/kit/maq02/:path*", permanent: false },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [...externalRedirects, ...movedRedirects];
  },
};

export default nextConfig;
