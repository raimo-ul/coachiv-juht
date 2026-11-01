// The three answers from the last day.
//
// Lifted from AttFocus's submit-self-assessment, keeping the parts that
// matter and dropping the parts that only existed because AttFocus is
// multi-tenant:
//
//   kept     the service role with the token as the only authority
//   kept     the 1-5 range check on both scales
//   kept     the open text being required, not optional
//   kept     409 on a second submission, which the page shows as the
//            thank-you rather than as an error
//   dropped  question_defs lookup, two payload shapes, the report-link
//            upsert. Here the questions are fixed at three, the payload has
//            one shape, and the final link is minted by dispatch-final.
//
// The field names are AttFocus's (attention_change, behaviour_change,
// open_text) so the two projects stay readable side by side.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { looksLikeToken } from "../_shared/tokens.ts";
import { env } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

/** AttFocus caps the text it feeds the model at 1200; store a little more. */
const MAX_TEXT = 4000;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

serve(async (req) => {
  console.log("submit-self-assessment boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "missing_env" });

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const token = String(raw?.token ?? "").trim();
  if (!looksLikeToken(token)) return json(404, { error: "not_found" });

  const attention = Number(raw?.attention_change);
  const behaviour = Number(raw?.behaviour_change);
  const openText = typeof raw?.open_text === "string" ? raw.open_text.trim() : "";

  if (!Number.isInteger(attention) || attention < 1 || attention > 5) {
    return json(400, { error: "invalid_attention" });
  }
  if (!Number.isInteger(behaviour) || behaviour < 1 || behaviour > 5) {
    return json(400, { error: "invalid_behaviour" });
  }
  // Required, as in AttFocus: the open text is the only sentence the final
  // paragraph has in the person's own words, and an empty one makes it poorer.
  if (!openText) return json(400, { error: "missing_open_text" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Conditional on sa_submitted_at still being null, so two taps on a slow
  // connection write once. The row count tells us which happened.
  const { data, error } = await supabase
    .from("enrollments")
    .update({
      sa_attention: attention,
      sa_behaviour: behaviour,
      sa_open_text: openText.slice(0, MAX_TEXT),
      sa_submitted_at: new Date().toISOString(),
    })
    .eq("sa_token", token)
    .is("sa_submitted_at", null)
    .select("id");

  if (error) {
    console.error("[submit-sa]", error.message);
    return json(500, { error: "save_failed" });
  }

  if (!data?.length) {
    // Either the token is unknown or it was already used. Tell those apart,
    // because the page shows the thank-you for the second and not-found for
    // the first.
    const existing = await supabase
      .from("enrollments")
      .select("id")
      .eq("sa_token", token)
      .maybeSingle();

    if (existing.data) return json(409, { error: "already_submitted" });
    return json(404, { error: "not_found" });
  }

  console.log(`[submit-sa] salvestatud ${data[0].id}`);
  return json(200, { ok: true });
});
