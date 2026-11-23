import Link from "next/link";
import { getSection, type PortalApp } from "@/lib/apps";

export function SectionIndex({ slug }: { slug: string }) {
  const section = getSection(slug);
  return (
    <DirectoryIndex
      back={{ href: "/", label: "MAGI" }}
      title={section.name}
      tagline={section.tagline}
      base={`/${section.slug}`}
      apps={section.apps}
    />
  );
}

/** A list of apps under one path: a portal section, or a folder inside one. */
export function DirectoryIndex({
  back,
  title,
  tagline,
  base,
  apps,
}: {
  back: { href: string; label: string };
  title: string;
  tagline?: string;
  base: string;
  apps: PortalApp[];
}) {

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
      <Link
        href={back.href}
        className="font-mono text-xs tracking-[0.3em] text-ink-soft hover:text-ink"
      >
        ← {back.label}
      </Link>

      <header className="mt-6">
        <h1 className="text-5xl font-semibold tracking-tight">{title}</h1>
        {tagline ? <p className="mt-2 text-ink-soft">{tagline}</p> : null}
      </header>

      {apps.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-line p-6 text-ink-soft">
          Todavía no hay apps aquí.
        </p>
      ) : (
        <ul className="mt-10 grid gap-3">
          {apps.map((app) => (
            <li key={app.slug}>
              <Link
                href={`${base}/${app.slug}`}
                prefetch={false}
                className="flex flex-col gap-1 rounded-2xl bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 outline-brand transition-shadow hover:shadow-[0_0_0_3px_var(--brand)] focus-visible:outline-3"
              >
                <span className="min-w-0">
                  <span className="block text-lg font-medium">
                    {app.name}
                  </span>
                  {app.description ? (
                    <span className="block truncate text-sm text-ink-soft">
                      {app.description}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-soft">
                  {base}/{app.slug}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
