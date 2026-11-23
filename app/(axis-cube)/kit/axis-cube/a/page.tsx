import type { Metadata } from "next";
import { Stage } from "@/components/axis-cube/Stage";

export const metadata: Metadata = { title: "Axis Cube — A, analógica" };

export default function Page() {
  return <Stage look="a" />;
}
