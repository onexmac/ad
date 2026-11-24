import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import { fontVars } from "@/lib/fonts";
import "./globals.css";

const geistSans = localFont({ src: "../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2", weight: "100 900" });
const geistMono = localFont({ src: "../../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2", weight: "100 900" });

export const metadata: Metadata = {
  title: { default: "MAGI", template: "%s · MAGI" },
  description: "Portal de apps: Kit y AD.",
};

export const viewport: Viewport = {
  themeColor: "#f3f3f3",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
      style={fontVars({ "--font-geist-sans": [geistSans, "Geist Variable"], "--font-geist-mono": [geistMono, "Geist Mono Variable"] })}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
