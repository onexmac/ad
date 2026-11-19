import type { Metadata, Viewport } from "next";
import { Probe } from "./Probe";

export const metadata: Metadata = { title: "Noticss — probe", robots: { index: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ff00aa" };

export default function Page() {
  return <Probe />;
}
