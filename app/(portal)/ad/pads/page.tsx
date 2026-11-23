import type { Metadata } from "next";
import { DirectoryIndex } from "@/components/section-index";
import { getFolder } from "@/lib/apps";

export const metadata: Metadata = { title: "Pads" };

export default function Page() {
  const pads = getFolder("ad", "pads");
  return (
    <DirectoryIndex
      back={{ href: "/ad", label: "AD" }}
      title={pads.name}
      tagline={pads.description}
      base="/ad/pads"
      apps={pads.apps}
    />
  );
}
