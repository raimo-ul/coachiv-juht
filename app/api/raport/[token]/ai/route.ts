// What the report page polls while the paragraph is being written.
//
// Returns the paragraph and nothing else. The token is the authority, exactly
// as it is for the page itself, and a caller who has it can already read the
// whole report, so this adds no reach.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { looksLikeToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!looksLikeToken(token)) {
    return NextResponse.json({ status: "failed" }, { status: 404 });
  }

  const { data, error } = await db()
    .from("tests")
    .select("ai_paragraph, ai_status")
    .eq("report_token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ status: "failed" }, { status: 404 });
  }

  return NextResponse.json(
    { status: data.ai_status, text: data.ai_paragraph ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}
