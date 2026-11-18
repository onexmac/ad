import type { Metadata, Viewport } from "next";
import { editions } from "@/lib/noticss/editions";
import { PaperB } from "@/components/noticss/PaperB";

export const metadata: Metadata = {
  title: "Noticss — B",
  // From the home screen, B runs up under the status bar (it fills it itself).
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Noticss" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#14110e",
  colorScheme: "light",
};

export default function Page() {
  return <PaperB editions={editions} />;
}
