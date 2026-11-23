import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pad 03",
  description: "La pantalla P2 de SwiftUI, en la web.",
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

// Forced light, with the Losa Flotante surface the prototype was drawn on.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
