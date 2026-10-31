// SPEC 8: the report's "Alusta · 15 €" button lands here.
//
// Takes the report token, because that is what the person is holding. It
// identifies both the test and the participant, and it is the same authority
// the report page itself runs on.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent } from "../_shared/content.ts";
import { looksLikeToken } from "../_shared/tokens.ts";
import { createCheckoutSession, findPromotionCode } from "../_shared/stripe.ts";
import { env } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

serve(async (req) => {
  console.log("create-checkout boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const content = getContent();
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "").trim();
  const promo = String(body?.promo ?? "").trim();

  if (!looksLikeToken(token)) return json(404, { error: content.report.notFound });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const site = (env("SITE_BASE_URL") ?? "").replace(/\/+$/, "");
  const priceId = env("STRIPE_PRICE_ID");

  if (!supabaseUrl || !serviceKey || !site || !priceId) {
    console.error("[create-checkout] seadistus puudub");
    return json(500, { error: content.errors.saveFailed });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const test = await supabase
    .from("tests")
    .select("id, participant_id, participants!inner(email)")
    .eq("report_token", token)
    .maybeSingle();

  if (test.error || !test.data) return json(404, { error: content.report.notFound });

  // SPEC 8 step 1. One programme at a time, and the database enforces it too
  // with a partial unique index, so this is the polite refusal rather than the
  // only one.
  const active = await supabase
    .from("enrollments")
    .select("id")
    .eq("participant_id", test.data.participant_id)
    .eq("status", "active")
    .maybeSingle();

  if (active.data?.id) return json(409, { error: content.report.cta.active });

  try {
    // The code travels in the request body rather than a cookie header: the
    // browser holds it in cj_promo and this function is on another origin, so
    // the cookie is never sent here.
    const promotionCodeId = promo ? await findPromotionCode(promo) : null;
    if (promo && !promotionCodeId) {
      console.warn(`[create-checkout] tundmatu või aegunud kood: ${promo.slice(0, 40)}`);
    }

    const session = await createCheckoutSession({
      priceId,
      participantId: test.data.participant_id,
      testId: test.data.id,
      email: (test.data as unknown as { participants: { email: string } }).participants.email,
      successUrl: `${site}/raport/${token}?alustatud=1`,
      cancelUrl: `${site}/raport/${token}`,
      promotionCodeId,
    });

    return json(200, { url: session.url });
  } catch (e) {
    console.error("[create-checkout]", String(e));
    return json(500, { error: content.errors.saveFailed });
  }
});
