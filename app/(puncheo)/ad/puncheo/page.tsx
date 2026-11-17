import { roomSheet } from "@/data/puncheo/rooms";
import { PunchApp } from "@/components/puncheo/PunchApp";

// The app: layout B (Leia). A and C live on as legacy layouts (legado-a, legado-c).
export default function Page() {
  return <PunchApp sheet={roomSheet} variant="b" />;
}
