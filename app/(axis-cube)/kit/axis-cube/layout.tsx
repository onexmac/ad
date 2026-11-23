import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axis Cube",
  description: "Cuatro cubos sobre el otomano de una biblioteca de los noventa, al atardecer: un Axis Cube, un 3×3, un 2×2 y un Ghost Cube. Tocá uno para levantarlo y girá sus capas con el dedo.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Axis Cube" },
  manifest: "/kit/axis-cube/manifest.webmanifest",
  icons: { icon: "/kit/axis-cube/icon-192.png", apple: "/kit/axis-cube/apple-icon.png" },
};

// The room is always at dusk, and the page opens black: the bars of the phone match the loading screen.
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
    <html lang="es">
      <body data-app>{children}</body>
    </html>
  );
}
