// SPEC 10: one yes or no, from a signed link.
//
// The signature is the whole authorisation. There is no row to look up and
// nothing to guess: the link says which enrolment, which day, which question
// and which answer, and the HMAC says nobody edited it on the way.
//
// Writes are idempotent by column. The same link clicked twice sets the same
// column to the same value, and a different answer to the same question
// overwrites: SPEC 10 says the last answer stands.

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
  console.log("submit-answer boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // SPEC 10: a GET shows the page and changes nothing, because mail scanners
  // open links. Only a POST writes.
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const content = getContent();
  const body = await req.json().catch(() => ({}));
  const payload = await verify(String(body?.signed ?? ""));

  if (!payload) return json(400, { error: content.answer.invalid });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: content.errors.saveFailed });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // SPEC 11: answering closes when the final report is generated, because
  // after that the numbers in it would no longer match the answers.
  const enrollment = await supabase
    .from("enrollments")
    .select("id, status, final_sent_at")
    .eq("id", payload.e)
    .maybeSingle();

  if (enrollment.error || !enrollment.data) return json(400, { error: content.answer.invalid });
  if (enrollment.data.final_sent_at) return json(409, { error: content.answer.closed });

  const column = `q${payload.q}`;
  const updated = await supabase
    .from("daily_answers")
    .update({ [column]: payload.v === 1, answered_at: new Date().toISOString() })
    .eq("enrollment_id", payload.e)
    .eq("day", payload.d)
    .select("id, q1, q2, q3, q4, q5, q6")
    .maybeSingle();

  if (updated.error) {
    console.error("[submit-answer]", updated.error.message);
    return json(500, { error: content.errors.saveFailed });
  }

  // No row means the day was never dispatched, so this link is for a day that
  // does not belong to this programme.
  if (!updated.data) return json(400, { error: content.answer.invalid });

  const answered = [1, 2, 3, 4, 5, 6]
    .filter((q) => (updated.data as Record<string, unknown>)[`q${q}`] !== null)
    .length;

  return json(200, { ok: true, answered, total: 6 });
});
