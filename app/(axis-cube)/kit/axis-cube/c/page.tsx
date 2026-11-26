import type { Metadata } from "next";
import { Stage } from "@/components/axis-cube/Stage";
import { AXIS_VERSION } from "@/lib/axis-cube/version";

// Reached by its address only: nothing links here and search engines are asked to leave it out.
export const metadata: Metadata = { title: "The Cubes — C, clásica", robots: { index: false } };

export default function Page() {
  return <Stage look="c" version={AXIS_VERSION} />;
}
