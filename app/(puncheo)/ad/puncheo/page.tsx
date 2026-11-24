import { roomSheet } from "@/data/puncheo/rooms";
import type { Viewport } from "next";
import { PunchApp } from "@/components/puncheo/PunchApp";
import { PuncheoSkeleton } from "@/components/skeleton/shapes";

// B lives in a vvs frame: beyond it, Safari's bars included, is black.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "light",
};

// The app: layout B (Leia). A and C live on as legacy layouts (legado-a, legado-c).
export default function Page() {
  return (
    <>
      <PunchApp sheet={roomSheet} variant="b" />
      <PuncheoSkeleton />
    </>
  );
}
