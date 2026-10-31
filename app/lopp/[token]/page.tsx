import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { FinalView } from "@/components/FinalView";

// SPEC 14: the report and final pages are noindex.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function FinalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <FinalView token={token} content={getContent()} />;
}
