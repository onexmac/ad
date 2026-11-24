import localFont from "next/font/local";
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import { fontVars } from "@/lib/fonts";

// The technical-minimalism faces (components/tech-index): Inter, JetBrains Mono for labels, and Chakra Petch, the
// squared, chamfered display face for numerals and stamps. Shared by every layout that wears the look.
const inter = localFont({ src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", weight: "100 900" });
const mono = localFont({ src: "../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", weight: "100 800" });
const tech = localFont({
  src: [
    { path: "../node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2", weight: "600" },
    { path: "../node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2", weight: "700" },
  ],
});

/** The CSS variables for `<html>`. */
export const techFontVars = fontVars({
  "--font-inter": [inter, "Inter Variable"],
  "--font-mono-face": [mono, "JetBrains Mono Variable"],
  "--font-tech": [tech, "Chakra Petch"],
});
