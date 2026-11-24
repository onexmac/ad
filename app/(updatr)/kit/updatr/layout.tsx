import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import { fontVars } from "@/lib/fonts";
import "./globals.css";

const geistSans = localFont({ src: "../../../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2", weight: "100 900" });
const geistMono = localFont({ src: "../../../../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2", weight: "100 900" });

export const metadata: Metadata = {
  title: "Updatr",
  description: "Lo que sigo: juegos, collabs, skins, personajes, cine, libros y series.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Updatr" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#edebe6",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={fontVars({ "--font-geist-sans": [geistSans, "Geist Variable"], "--font-geist-mono": [geistMono, "Geist Mono Variable"] })}
    >
      <body data-app className="min-h-full">
        {children}
      </body>
    </html>
  );
}
