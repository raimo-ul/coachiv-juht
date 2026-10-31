// "Tahan, et Raimo võtaks minuga ühendust."
//
// The report token is the authority, as everywhere else in this product. A
// caller holding it can already read the whole report, so being able to set a
// flag on the same person adds no reach.
//
// Setting only, never clearing. Unticking the box is not a withdrawal of a
// request already sent, and a person who changes their mind writes to Raimo.
// That also makes the call idempotent: ticking twice is one request.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { looksLikeToken } from "../_shared/tokens.ts";
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
  console.log("request-contact boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false });

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "").trim();
  if (!looksLikeToken(token)) return json(404, { ok: false });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { ok: false });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const test = await supabase
    .from("tests")
    .select("participant_id")
    .eq("report_token", token)
    .maybeSingle();

  if (test.error || !test.data) return json(404, { ok: false });

  const upd = await supabase
    .from("participants")
    .update({ contact_requested: true, contact_requested_at: new Date().toISOString() })
    .eq("id", test.data.participant_id)
    .eq("contact_requested", false);   // keeps the first request's timestamp

  if (upd.error) {
    console.error("[request-contact]", upd.error.message);
    return json(500, { ok: false });
  }

  return json(200, { ok: true });
});
