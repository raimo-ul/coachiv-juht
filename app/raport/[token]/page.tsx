import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { ReportView } from "@/components/ReportView";

// SPEC 14: the report and final pages must not be indexed. These are a
// person's own answers behind a URL, and a crawler that found one would put it
// in a search result.
export const metadata: Metadata = { robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ token: string }> };

export default async function ReportPage({ params }: PageProps) {
  const { token } = await params;

  // The page no longer touches the database. It passes the token and the
  // content to a client component, which asks get-report-by-token for the
  // numbers. That is why there is no service role key in this app any more.
  return <ReportView token={token} content={getContent()} />;
}
