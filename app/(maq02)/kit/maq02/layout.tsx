import type { Metadata, Viewport } from "next";
import "@fontsource/anton/400.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/800.css";
import "@fontsource/nunito/900.css";
import "@fontsource/silkscreen/400.css";
import "@fontsource/dseg7-classic/700.css";
import "./globals.css";

// The faces go in under their own names, not next/font's: the scene draws the MAZA decal on a canvas by family name
// (Anton, Chakra Petch). The screen: Nunito for words, Silkscreen for pixel labels, DSEG7 for the LCD digits.
export const metadata: Metadata = {
  title: "MAQ02",
  description: "A self-loading concrete mixer as an item in an inventory screen, in paper and ink.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MAQ02" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

// The theme Marcos last picked, set before the first paint so a light page never flashes dark.
const THEME = `try{var t=localStorage.getItem("ps2-item-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
        {children}
      </body>
    </html>
  );
}
