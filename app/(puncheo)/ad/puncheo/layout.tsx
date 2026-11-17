import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Roboto_Condensed } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Leia's CHECK OUT is Helvetica Neue Condensed Bold; this is its web stand-in where iOS lacks it.
const cond = Roboto_Condensed({ variable: "--font-cond", subsets: ["latin"], weight: ["700"] });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "Puncheo",
  description: "Puncheo de formaleta, vivienda N1: pre-armado y pre-chorrea.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Puncheo" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable} ${cond.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
