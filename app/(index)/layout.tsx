import type { Metadata, Viewport } from "next";
import { techFontVars } from "@/lib/tech-fonts";
import "@/components/tech-index/tech.css";

// The section indices (/ad, /kit): technical minimalism in a vvs, like the Pads index.
export const metadata: Metadata = {
  title: "MAGI",
  description: "Portal de apps: Kit y AD.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MAGI" },
};

// vvv: black beyond the frame (Safari's bars, the overscroll).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="antialiased" style={techFontVars}>
      <body>{children}</body>
    </html>
  );
}
