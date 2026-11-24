import { editions } from "@/lib/noticss/editions";
import { IssueA } from "@/components/noticss/IssueA";
import { NoticssLoading } from "@/components/loading/apps";

export default function Page() {
  return (
    <>
      <IssueA editions={editions} />
      <NoticssLoading />
    </>
  );
}
