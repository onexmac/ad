import Link from "next/link";
import { sections } from "@/lib/apps";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-mono text-xs tracking-[0.3em] text-ink-soft">MAGI</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.slug}
            href={`/${section.slug}`}
            className="group flex min-h-56 flex-col justify-between rounded-3xl bg-card p-6 outline-brand transition-shadow hover:shadow-[0_0_0_3px_var(--brand)] focus-visible:outline-3"
          >
            <span className="font-mono text-xs text-ink-soft">
              /{section.slug}
            </span>
            <span>
              <span className="block text-5xl font-semibold tracking-tight">
                {section.name}
              </span>
              <span className="mt-2 flex items-baseline justify-between text-ink-soft">
                <span>{section.tagline}</span>
                <span className="font-mono text-xs">
                  {section.apps.length}{" "}
                  {section.apps.length === 1 ? "app" : "apps"}
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
