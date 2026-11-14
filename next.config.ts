import type { NextConfig } from "next";
import registry from "./lib/apps.json";

type RegistryApp = { slug: string; external?: string };

// Apps that still live in their own deployment are reachable at their portal
// path through a temporary redirect, so the shared link never has to change
// when the app's code later moves into this repo.
const externalRedirects = registry.sections.flatMap((section) =>
  (section.apps as RegistryApp[])
    .filter((app) => app.external)
    .map((app) => ({
      source: `/${section.slug}/${app.slug}`,
      destination: app.external as string,
      permanent: false,
    })),
);

const nextConfig: NextConfig = {
  async redirects() {
    return externalRedirects;
  },
};

export default nextConfig;
