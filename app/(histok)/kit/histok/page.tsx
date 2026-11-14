import { semestres } from "@/data/histok/topics";
import { IndexScreen } from "@/components/histok/IndexScreen";

export default function Home() {
  return <IndexScreen semestres={semestres} />;
}
