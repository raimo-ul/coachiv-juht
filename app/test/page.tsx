import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { TestFlow } from "@/components/TestFlow";

const t = getContent();

export const metadata: Metadata = {
  title: `${t.test.startButton} · ${t.meta.siteName}`,
};

export default function TestPage() {
  // The flow is one client component holding all 18 answers. Content is read
  // here on the server and handed down, so the JSON never ships twice.
  return <TestFlow content={t} />;
}
