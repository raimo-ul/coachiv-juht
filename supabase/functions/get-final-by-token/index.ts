// The final report page reads this, and writes the three paragraphs the first
// time anyone looks.
//
// The numbers were computed and stored by dispatch-final, so they are handed
// back as they were saved: the letter went out naming certain figures and the
// page a month later has to show the same ones.
//
// The paragraphs are not in that saving. They take around a minute, and
// dispatch-final works through every programme ending in the same hour one
// after another, so doing it there put the function past its wall clock as
// soon as there was more than one. The work happens here instead, inside the
// request the page is already polling, claimed so that two open tabs produce
// one set of paragraphs rather than two.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent } from "../_shared/content.ts";
import { looksLikeToken } from "../_shared/tokens.ts";
import { writeFinalParagraph } from "../_shared/ai.ts";
import { env } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

/** Long enough that a generation finishes, short enough that a dead one retries. */
const CLAIM_STALE_MS = 4 * 60 * 1000;

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
  console.log("get-final-by-token boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  if (!looksLikeToken(token)) return json(404, { error: "not_found" });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "missing_env" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, start_date, end_date, final_report")
    .eq("final_token", token)
    .maybeSingle();

  if (error) {
    console.error("[get-final]", error.message);
    return json(500, { error: "lookup_failed" });
  }
  if (!data || !data.final_report) return json(404, { error: "not_found" });

  const report = data.final_report as Record<string, unknown>;
  const body = () => ({ period: { start: data.start_date, end: data.end_date }, ...report });

  if (report.aiStatus === "done" || report.aiStatus === "failed") return json(200, body());

  // Someone else is writing them, recently enough to believe.
  if (report.aiStatus === "generating") {
    const started = Number(report.aiStartedAt ?? 0);
    if (Date.now() - started < CLAIM_STALE_MS) return json(200, body());
    console.warn(`[get-final] seisma jäänud claim üle võetud: ${data.id}`);
  }

  // Claim by writing the status back, conditional on it not having moved. Two
  // tabs race here and only one wins; the other is told to keep waiting.
  const claimed = { ...report, aiStatus: "generating", aiStartedAt: Date.now() };
  const claim = await supabase
    .from("enrollments")
    .update({ final_report: claimed })
    .eq("id", data.id)
    .eq("final_report->>aiStatus", String(report.aiStatus ?? "pending"))
    .select("id");

  if (claim.error || !claim.data?.length) {
    return json(200, { ...body(), aiStatus: "generating" });
  }

  const content = getContent();
  const numbers = report.numbers as {
    workdays: number;
    answeredDays: number;
    questions: Array<{ q: number; yes: number; answered: number; yesRate: number | null }>;
    strongest: Array<{ q: number; yes: number; answered: number }>;
    weakest: { q: number; yes: number; answered: number } | null;
  };

  // Only what the paragraph may describe: the counts and the question texts.
  // No test scores, because there is nothing here to compare them against.
  const q = (n: number) =>
    content.daily.questions[`q${n}` as keyof typeof content.daily.questions];

  const ai = await writeFinalParagraph({
    workdays: numbers.workdays,
    answeredDays: numbers.answeredDays,
    perQuestion: numbers.questions.map((x) => ({ ...x, text: q(x.q) })),
    strongest: numbers.strongest.map((x) => ({ ...x, text: q(x.q) })),
    weakest: numbers.weakest ? { ...numbers.weakest, text: q(numbers.weakest.q) } : null,
  });

  const finished = {
    ...report,
    ai: ai.status === "done" ? ai.text : null,
    aiStatus: ai.status === "done" ? "done" : "failed",
    aiStartedAt: undefined,
  };

  const stored = await supabase
    .from("enrollments")
    .update({ final_report: finished })
    .eq("id", data.id);

  if (stored.error) console.error("[get-final] salvestamine:", stored.error.message);

  return json(200, { period: { start: data.start_date, end: data.end_date }, ...finished });
});
