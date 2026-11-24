import { redirect } from "next/navigation";

/* B is Noticss's front door now: an old /b link lands there. */
export default function Page() {
  redirect("/kit/noticss");
}
