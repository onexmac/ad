import { notFound } from "next/navigation";
import { getTopic, topics } from "@/data/histok/topics";
import { ReelScreen } from "@/components/histok/ReelScreen";

export function generateStaticParams() {
  return topics.map((t) => ({ slug: t.slug }));
}

export default async function TemaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();
  return <ReelScreen topic={topic} />;
}
