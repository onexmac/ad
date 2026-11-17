import { roomSheet } from "@/data/puncheo/rooms";
import { PunchApp } from "@/components/puncheo/PunchApp";


export default function Page() {
  return <PunchApp sheet={roomSheet} variant="a" />;
}
