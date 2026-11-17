import { editions } from "@/lib/noticss/editions";
import { IssueA } from "@/components/noticss/IssueA";

export default function Page() {
  return <IssueA editions={editions} />;
}
