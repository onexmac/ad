import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axis Cube",
  description: "Tres cubos sobre el otomano de una biblioteca de los noventa, al atardecer: un Axis Cube, un 3×3 y un 2×2. Tocá uno para levantarlo y girá sus capas con el dedo.",
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
    <html lang="es">
      <body data-app>{children}</body>
    </html>
  );
}
