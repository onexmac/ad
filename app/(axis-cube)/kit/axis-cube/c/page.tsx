import type { Metadata } from "next";
import { Stage } from "@/components/axis-cube/Stage";

export const metadata: Metadata = { title: "Axis Cube — C, clásica" };

export default function Page() {
  return <Stage look="c" />;
}
