import { editions } from "@/lib/noticss/editions";
import { IssueA } from "@/components/noticss/IssueA";
import { NoticssSkeleton } from "@/components/skeleton/shapes";

export default function Page() {
  return (
    <>
      <IssueA editions={editions} />
      <NoticssSkeleton />
    </>
  );
}
