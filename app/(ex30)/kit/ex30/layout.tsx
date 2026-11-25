import type { Metadata, Viewport } from "next";
import { techFontVars } from "@/lib/tech-fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "EX30",
  description: "Un Volvo EX30 en 3D, trazado de fotografías, para diseñarle un livery.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "EX30" },
};

// vvv: black beyond the frame (Safari's bars, the overscroll), and the page opens black under its loading bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="antialiased" style={techFontVars}>
      <body>{children}</body>
    </html>
  );
}
