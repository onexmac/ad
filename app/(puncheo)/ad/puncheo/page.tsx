import { roomSheet as sheet } from "@/data/puncheo/rooms";
import { PunchScreen } from "@/components/puncheo/PunchScreen";

export default function Page() {
  return <PunchScreen sheet={sheet} />;
}
