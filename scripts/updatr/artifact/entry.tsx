import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { franchises, items } from "@/data/updatr/items";
import { MagazineScreen } from "@/components/updatr/MagazineScreen";
import { GridScreen } from "@/components/updatr/GridScreen";
import { IndexScreen } from "@/components/updatr/IndexScreen";
import imageMap from "updatr-images";

const map = imageMap as Record<string, string>;
const local = items.map((i) => (i.image && map[i.image] ? { ...i, image: map[i.image] } : i));
type View = "issue" | "grid" | "index";
const read = (): View | null => {
  const h = location.hash.slice(1);
  return h === "grid" || h === "index" || h === "issue" ? h : null;
};

function App() {
  const [v, setV] = useState<View>(() => read() ?? "issue");
  useEffect(() => {
    const on = () => {
      const next = read();
      if (next) {
        setV(next);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  if (v === "grid") return <GridScreen items={local} franchises={franchises} />;
  if (v === "index") return <IndexScreen items={local} franchises={franchises} />;
  return <MagazineScreen items={local} franchises={franchises} />;
}

createRoot(document.getElementById("root")!).render(<App />);
