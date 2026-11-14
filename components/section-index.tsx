import Link from "next/link";
import { getSection } from "@/lib/apps";

export function SectionIndex({ slug }: { slug: string }) {
  const section = getSection(slug);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
      <Link
        href="/"
        className="font-mono text-xs tracking-[0.3em] text-ink-soft hover:text-ink"
      >
        ← MAGI
      </Link>

      <header className="mt-6">
        <h1 className="text-5xl font-semibold tracking-tight">{section.name}</h1>
        <p className="mt-2 text-ink-soft">{section.tagline}</p>
      </header>

      {section.apps.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-line p-6 text-ink-soft">
          Todavía no hay apps aquí.
        </p>
      ) : (
        <ul className="mt-10 grid gap-3">
          {section.apps.map((app) => (
            <li key={app.slug}>
              <Link
                href={`/${section.slug}/${app.slug}`}
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
                  /{section.slug}/{app.slug}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
