import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Axis Cube",
  description: "Un Axis Cube flotando en un cuarto al atardecer: deslizá los aros para girar sus capas, mantenelo para armarlo o desarmarlo.",
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
    <html lang="es" className={manrope.variable}>
      <body data-app>{children}</body>
    </html>
  );
}
