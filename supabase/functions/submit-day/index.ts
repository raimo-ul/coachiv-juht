// All six answers for one day, in one submission.
//
// The same shape as AttFocus's submit-responses, which is the shape Raimo
// asked for: the reader marks every question on the page and presses send
// once. An earlier version here saved each click as it happened, which meant
// six round trips, six chances to half-finish, and a link in the letter per
// answer.
//
// The signed day link is the whole authorisation. It names the enrolment and
// the date and nothing else; the answers come in the body, where the reader
// put them.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent } from "../_shared/content.ts";
import { verify } from "../_shared/signing.ts";
import { env } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

serve(async (req) => {
  console.log("submit-day boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // SPEC 10: a GET never writes, because mail scanners open links. The letter
  // now carries one link that only opens the page, so there is nothing for a
  // scanner to answer, and this still refuses anything but a POST.
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const content = getContent();
  const body = await req.json().catch(() => ({}));
  const payload = await verify(String(body?.signed ?? ""));
  if (!payload) return json(400, { error: content.answer.invalid });

  // Six booleans, keyed by question number. Anything missing or out of range
  // means the page sent something it should not have.
  const answers = body?.answers as Record<string, unknown> | undefined;
  const patch: Record<string, boolean> = {};
  for (let q = 1; q <= 6; q++) {
    const v = answers?.[String(q)];
    if (typeof v !== "boolean") return json(400, { error: content.errors.incomplete });
    patch[`q${q}`] = v;
  }

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: content.errors.saveFailed });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // SPEC 11: answering closes once the final report exists, because after that
  // the numbers in it would no longer match the answers behind them.
  const enrollment = await supabase
    .from("enrollments")
    .select("id, final_sent_at")
    .eq("id", payload.e)
    .maybeSingle();

  if (enrollment.error || !enrollment.data) return json(400, { error: content.answer.invalid });
  if (enrollment.data.final_sent_at) return json(409, { error: content.answer.closed });

  const updated = await supabase
    .from("daily_answers")
    .update({ ...patch, answered_at: new Date().toISOString() })
    .eq("enrollment_id", payload.e)
    .eq("day", payload.d)
    .select("id");

  if (updated.error) {
    console.error("[submit-day]", updated.error.message);
    return json(500, { error: content.errors.saveFailed });
  }

  // No row means this day was never dispatched, so the link is for a day that
  // does not belong to this programme.
  if (!updated.data?.length) return json(400, { error: content.answer.invalid });

  return json(200, { ok: true });
});
