import type { Metadata, Viewport } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";

// One serif for everything, in its optical sizes: the display cut on the
// masthead and headlines, the text cut in the body, small caps for labels.
const serif = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Noticss",
  description: "El diario de la mañana: política, economía, geopolítica y construcción, desde Cartago.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Noticss" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f1ece2",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${serif.variable} h-full antialiased`}>
      <body data-app className="min-h-full">
        {children}
      </body>
    </html>
  );
}
