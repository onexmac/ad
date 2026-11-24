import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/roboto/index.css";
import { fontVars } from "@/lib/fonts";
import "./globals.css";

const roboto = localFont({ src: "../../../../node_modules/@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2", weight: "100 900" });

export const metadata: Metadata = {
  title: "Pads",
  description: "Prototipos mobile de Adelante (Losa Flotante).",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Pads" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f3f3",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased" style={fontVars({ "--font-roboto": [roboto, "Roboto Variable"] })}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
