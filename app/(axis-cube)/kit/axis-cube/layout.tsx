import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["500", "700"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["600"] });

export const metadata: Metadata = {
  title: "Axis Cube",
  description: "Un Axis Cube flotando en un cuarto al atardecer: tocalo para desarmarlo, mantenelo para abrirlo en sus 26 piezas.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Axis Cube" },
};

// The room is always at dusk.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0705",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${manrope.variable} ${unbounded.variable}`}>
      <body data-app>{children}</body>
    </html>
  );
}
