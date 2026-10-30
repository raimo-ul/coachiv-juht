// Everything the report page shows, for one token.
//
// The page used to read the database itself, as a Next.js server component.
// That is why Vercel needed a service role key. Now the page is a plain client
// page that calls this, and the key never leaves Supabase. See DECISIONS.md.
//
// The levels and pair sentences are worked out here rather than in the browser,
// so there is one implementation of the scoring rules and the page only has to
// render what it is handed.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent } from "../_shared/content.ts";
import { looksLikeToken } from "../_shared/tokens.ts";
import { forDisplay, scoreTest } from "../_shared/scoring.ts";
import { env } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      // One person's own answers. Never store this anywhere on the way back.
      "Cache-Control": "no-store",
    },
  });
}

serve(async (req) => {
  console.log("get-report-by-token boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";

  // SPEC 15: a wrong token is a 404. The shape is checked first so a mistyped
  // link costs no lookup.
  if (!looksLikeToken(token)) return json(404, { error: "not_found" });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "missing_env" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("tests")
    .select("id, locale, answers, ai_paragraph, ai_status, participant_id, created_at")
    .eq("report_token", token)
    .maybeSingle();

  if (error) {
    console.error("[get-report] lookup:", error.message);
    return json(500, { error: "lookup_failed" });
  }
  if (!data) return json(404, { error: "not_found" });

  const locale = (data.locale as string) ?? getContent().locale;
  const answers = data.answers as Record<string, number>;

  let scored;
  try {
    scored = scoreTest(answers, locale);
  } catch (e) {
    console.error("[get-report] skoorimine:", String(e));
    return json(500, { error: "scoring_failed" });
  }

  // Stage B puts a live programme in the way of the payment call to action.
  // Until enrollments exist this is always false, and asking now means the
  // report shows the right thing the day stage B lands.
  const active = await supabase
    .from("enrollments")
    .select("id")
    .eq("participant_id", data.participant_id)
    .eq("status", "active")
    .maybeSingle();

  return json(200, {
    locale,
    parts: Object.entries(scored.scores).map(([key, score]) => ({
      key,
      score,
      display: forDisplay(score as number),
      level: scored.levels[key as keyof typeof scored.levels],
    })),
    pairs: scored.pairs,
    ai: { status: data.ai_status, text: data.ai_paragraph ?? null },
    hasActiveProgramme: Boolean(active.data?.id),
  });
});
