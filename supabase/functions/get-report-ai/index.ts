// The paragraph: returns it, and writes it if nobody has yet.
//
// It used to be written in the background by submit-test, under
// EdgeRuntime.waitUntil. That is not reliable for work this long. The model
// thinks before it writes and a run takes around 36 seconds, and the isolate
// is not guaranteed to outlive its own response by that much: four test
// submissions gave two done, one failed and one stuck on pending for ever.
//
// Now the work happens here, inside the request the report page is already
// polling, so something is always waiting on it. The first poll claims the row
// and generates; later polls see the claim and wait. See DECISIONS.md.
//
// The token is the authority, exactly as for the report itself. A caller
// holding it can already read the whole report, so this adds no reach.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent } from "../_shared/content.ts";
import { looksLikeToken } from "../_shared/tokens.ts";
import { scoreTest } from "../_shared/scoring.ts";
import { writeReportParagraph } from "../_shared/ai.ts";
import { env } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

/**
 * How long a claim is trusted before another request may take it over.
 *
 * Longer than a generation takes, so two tabs never both write, and short
 * enough that a function killed mid-write does not strand the row: the next
 * visit picks it up instead of showing nothing for ever.
 */
const CLAIM_STALE_MS = 3 * 60 * 1000;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

serve(async (req) => {
  console.log("get-report-ai boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  if (!looksLikeToken(token)) return json(404, { status: "failed" });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { status: "failed" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("tests")
    .select("id, locale, answers, ai_paragraph, ai_status, ai_started_at")
    .eq("report_token", token)
    .maybeSingle();

  if (error || !data) return json(404, { status: "failed" });

  if (data.ai_status === "done") {
    return json(200, { status: "done", text: data.ai_paragraph ?? null });
  }
  if (data.ai_status === "failed") {
    return json(200, { status: "failed", text: null });
  }

  // Someone else is already writing it, and recently enough to believe.
  if (data.ai_status === "generating") {
    const startedAt = data.ai_started_at ? Date.parse(data.ai_started_at as string) : 0;
    if (Date.now() - startedAt < CLAIM_STALE_MS) {
      return json(200, { status: "pending", text: null });
    }
    console.warn(`[get-report-ai] seisma jäänud claim üle võetud: test=${data.id}`);
  }

  // Claim the row. The filter on the old status is what makes this atomic:
  // if another request got here first, this update matches nothing and the
  // caller is told to keep waiting rather than generating a second paragraph.
  const claim = await supabase
    .from("tests")
    .update({ ai_status: "generating", ai_started_at: new Date().toISOString() })
    .eq("id", data.id)
    .eq("ai_status", data.ai_status)
    .select("id");

  if (claim.error) {
    console.error("[get-report-ai] claim:", claim.error.message);
    return json(200, { status: "pending", text: null });
  }
  if (!claim.data?.length) {
    return json(200, { status: "pending", text: null });
  }

  const content = getContent(data.locale as string);
  const answers = data.answers as Record<string, number>;

  let scored;
  try {
    scored = scoreTest(answers, data.locale as string);
  } catch (e) {
    console.error("[get-report-ai] skoorimine:", String(e));
    await supabase.from("tests").update({ ai_status: "failed" }).eq("id", data.id);
    return json(200, { status: "failed", text: null });
  }

  const ai = await writeReportParagraph({
    scores: scored.scores,
    levels: scored.levels,
    answers,
    items: content.test.items,
  });

  await supabase
    .from("tests")
    .update(
      ai.status === "done"
        ? { ai_paragraph: ai.text, ai_status: "done" }
        : { ai_status: "failed" },
    )
    .eq("id", data.id);

  return ai.status === "done"
    ? json(200, { status: "done", text: ai.text })
    : json(200, { status: "failed", text: null });
});
