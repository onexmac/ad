import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/roboto-serif/index.css";
import { fontVars } from "@/lib/fonts";
import "./globals.css";

const robotoSerif = localFont({ src: "../../../../node_modules/@fontsource-variable/roboto-serif/files/roboto-serif-latin-wght-normal.woff2", weight: "100 900" });

export const metadata: Metadata = {
  title: "Histok",
  description: "Repasa el temario en formato reel",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Histok",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" style={fontVars({ "--font-serif": [robotoSerif, "Roboto Serif Variable"] })}>
      <body data-app className="min-h-full bg-black text-white">
        {children}
      </body>
    </html>
  );
}
