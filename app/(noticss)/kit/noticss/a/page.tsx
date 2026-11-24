import type { Metadata } from "next";
import { editions } from "@/lib/noticss/editions";
import { IssueA } from "@/components/noticss/IssueA";
import { NoticssLoading } from "@/components/loading/apps";

/* Version A, the issue in Updatr's grammar. Noticss itself opens on B (/kit/noticss). */

export const metadata: Metadata = { title: "Noticss — A" };

export default function Page() {
  return (
    <>
      <IssueA editions={editions} />
      <NoticssLoading />
    </>
  );
}
