// What the /v/ page needs to render: the six questions and what is answered.
//
// A GET, and it writes nothing. SPEC 10 wants the page to show every question
// so the rest of the day can be answered in one place, which means it has to
// read the day's row before anything is clicked.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent } from "../_shared/content.ts";
import { sign, verify } from "../_shared/signing.ts";
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
      "Cache-Control": "no-store",
    },
  });
}

serve(async (req) => {
  console.log("get-day-by-signed boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const signed = new URL(req.url).searchParams.get("signed") ?? "";
  const payload = await verify(signed);
  const content = getContent();

  if (!payload) return json(400, { error: content.answer.invalid });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: content.errors.saveFailed });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const enrollment = await supabase
    .from("enrollments")
    .select("id, final_sent_at")
    .eq("id", payload.e)
    .maybeSingle();

  if (enrollment.error || !enrollment.data) return json(400, { error: content.answer.invalid });
  if (enrollment.data.final_sent_at) return json(409, { error: content.answer.closed });

  const day = await supabase
    .from("daily_answers")
    .select("day_index, q1, q2, q3, q4, q5, q6")
    .eq("enrollment_id", payload.e)
    .eq("day", payload.d)
    .maybeSingle();

  if (day.error || !day.data) return json(400, { error: content.answer.invalid });

  // Every question gets its own freshly signed pair, so the page can offer the
  // rest of the day without the reader going back to the email.
  const questions = [];
  for (let q = 1; q <= 6; q++) {
    questions.push({
      q,
      text: content.daily.questions[`q${q}` as keyof typeof content.daily.questions],
      answer: (day.data as Record<string, unknown>)[`q${q}`] as boolean | null,
      yes: await sign({ e: payload.e, d: payload.d, q, v: 1 }),
      no: await sign({ e: payload.e, d: payload.d, q, v: 0 }),
    });
  }

  return json(200, {
    day: payload.d,
    dayIndex: day.data.day_index,
    clicked: payload.q,
    questions,
  });
});
