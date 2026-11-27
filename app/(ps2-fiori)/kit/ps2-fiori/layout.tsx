import type { Metadata, Viewport } from "next";
import "@fontsource/anton/400.css";
import "@fontsource/chakra-petch/400.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/share-tech-mono/400.css";
import "./globals.css";

// The faces go in under their own names (Anton, Chakra Petch, Share Tech Mono), not next/font's: the scene draws the
// MAZA decal on a canvas by family name, as the artifact did.
export const metadata: Metadata = {
  title: "PS2 Fiori",
  description: "A self-loading concrete mixer as an item in a PS2-era inventory screen.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PS2 Fiori" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#050b1e",
};

// The theme Marcos last picked, set before the first paint so a light page never flashes dark.
const THEME = `try{var t=localStorage.getItem("ps2-item-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
        {children}
      </body>
    </html>
  );
}
