import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import { fontVars } from "@/lib/fonts";
import "./home.css";

const inter = localFont({ src: "../../../../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", weight: "100 900" });
const mono = localFont({ src: "../../../../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", weight: "100 800" });
// The squared, chamfered display face for numerals and stamps.
const tech = localFont({
  src: [
    { path: "../../../../../node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2", weight: "600" },
    { path: "../../../../../node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2", weight: "700" },
  ],
});

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
    <html
      lang="es"
      className="antialiased"
      style={fontVars({
        "--font-inter": [inter, "Inter Variable"],
        "--font-mono-face": [mono, "JetBrains Mono Variable"],
        "--font-tech": [tech, "Chakra Petch"],
      })}
    >
      <body>{children}</body>
    </html>
  );
}
