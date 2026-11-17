import { createRoot } from "react-dom/client";
import { sheet } from "@/data/puncheo/formaleta-n1";
import { PunchScreen } from "@/components/puncheo/PunchScreen";

createRoot(document.getElementById("root")!).render(<PunchScreen sheet={sheet} />);
