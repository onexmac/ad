import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/roboto-condensed/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import { fontVars } from "@/lib/fonts";
import "./globals.css";

const inter = localFont({ src: "../../../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", weight: "100 900" });
// Leia's CHECK OUT is Helvetica Neue Condensed Bold; this is its web stand-in where iOS lacks it.
const cond = localFont({ src: "../../../../node_modules/@fontsource-variable/roboto-condensed/files/roboto-condensed-latin-wght-normal.woff2", weight: "100 900" });
const mono = localFont({ src: "../../../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", weight: "100 800" });

export const metadata: Metadata = {
  title: "Puncheo",
  description: "Puncheo de formaleta, vivienda N1: pre-armado y pre-chorrea.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Puncheo" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
      style={fontVars({
        "--font-inter": [inter, "Inter Variable"],
        "--font-mono-face": [mono, "JetBrains Mono Variable"],
        "--font-cond": [cond, "Roboto Condensed Variable"],
      })}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
