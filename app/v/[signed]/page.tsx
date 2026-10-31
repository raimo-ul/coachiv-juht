import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { AnswerView } from "@/components/AnswerView";

// A person's own answers behind a signed link, so it must never be indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AnswerPage({ params }: { params: Promise<{ signed: string }> }) {
  const { signed } = await params;
  return <AnswerView signed={signed} content={getContent()} />;
}
