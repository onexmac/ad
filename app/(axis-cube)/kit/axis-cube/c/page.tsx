import type { Metadata } from "next";
import { Stage } from "@/components/axis-cube/Stage";

// Reached by its address only: nothing links here and search engines are asked to leave it out.
export const metadata: Metadata = { title: "Axis Cube — C, clásica", robots: { index: false } };

export default function Page() {
  return <Stage look="c" />;
}
