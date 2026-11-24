import { semestres } from "@/data/histok/topics";
import { IndexScreen } from "@/components/histok/IndexScreen";
import { HistokLoading } from "@/components/loading/apps";

export default function Home() {
  return (
    <>
      <IndexScreen semestres={semestres} />
      <HistokLoading />
    </>
  );
}
