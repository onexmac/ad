import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { roomSheet as sheet } from "@/data/puncheo/rooms";
import { PunchApp } from "@/components/puncheo/PunchApp";

type View = "a" | "b" | "c";
const read = (): View => {
  const h = location.hash.slice(1);
  return h === "b" || h === "c" ? h : "a";
};

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
  return <PunchApp key={v} sheet={sheet} variant={v} />;
}

createRoot(document.getElementById("root")!).render(<App />);
