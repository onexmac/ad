import type { Metadata, Viewport } from "next";
import { Bitter, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const note = Bitter({ variable: "--font-note", subsets: ["latin"], style: ["italic"], weight: ["400"] });
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
    <html lang="es" className={`${inter.variable} ${mono.variable} ${note.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
