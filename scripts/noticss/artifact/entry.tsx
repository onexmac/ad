import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { editions, rebase } from "@/lib/noticss/editions";
import { IssueA } from "@/components/noticss/IssueA";
import { PaperB } from "@/components/noticss/PaperB";

// The artifact serves the photos from a folder next to the page.
const local = rebase(editions, "shots/");
type View = "a" | "b";
const read = (): View => (location.hash.slice(1) === "b" ? "b" : "a");

function App() {
  const [v, setV] = useState<View>(read);
  useEffect(() => {
    const on = () => {
      setV(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return v === "b" ? <PaperB editions={local} /> : <IssueA editions={local} />;
}

createRoot(document.getElementById("root")!).render(<App />);
