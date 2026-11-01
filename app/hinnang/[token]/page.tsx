import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { SelfAssessmentView } from "@/components/SelfAssessmentView";

// SPEC 14: every token page is noindex.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SelfAssessmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SelfAssessmentView token={token} content={getContent()} />;
}
