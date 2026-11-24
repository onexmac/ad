import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import { fontVars } from "@/lib/fonts";
import "./globals.css";

// One serif for everything, in its optical sizes: the display cut on the
// masthead and headlines, the text cut in the body, small caps for labels.
const serif = localFont({
  src: [
    { path: "../../../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2", style: "normal" },
    { path: "../../../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2", style: "italic" },
  ],
  weight: "200 800",
});

export const metadata: Metadata = {
  title: "Noticss",
  description: "El diario de la mañana: política, economía, geopolítica y construcción, desde Cartago.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Noticss" },
  // Newer editions link the outlets' own photos: ask for them without saying
  // where from, which some image hosts refuse.
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f1ece2",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased" style={fontVars({ "--font-newsreader": [serif, "Newsreader Variable"] })}>
      <body data-app className="min-h-full">
        {children}
      </body>
    </html>
  );
}
