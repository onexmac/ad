import type { Metadata, Viewport } from "next";
import { techFontVars } from "@/lib/tech-fonts";
import "@/components/tech-index/tech.css";

export const metadata: Metadata = {
  title: "Pads",
  description: "Prototipos de Adelante.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Pads" },
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
