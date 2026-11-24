import type { Metadata, Viewport } from "next";
import { GATE_SCRIPT } from "@/lib/axis-cube/gate";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Cubes",
  description: "Cuatro cubos sobre el otomano de una biblioteca de los noventa, al atardecer: un Axis Cube, un 3×3, un 2×2 y un Ghost Cube. Tocá uno para levantarlo y girá sus capas con el dedo.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "The Cubes" },
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
    // The inline script runs as the page is parsed, before the first paint: it decides whether the install screen
    // shows (lib/axis-cube/gate.ts) and says so in classes on <html>, which is why React is told to leave them be.
    <html lang="es" suppressHydrationWarning>
      <body data-app>
        <script dangerouslySetInnerHTML={{ __html: GATE_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
